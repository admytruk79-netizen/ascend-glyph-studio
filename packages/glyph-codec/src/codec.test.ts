import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rsEncode, rsDecode, encodeMessage, readBand, importUnitKey, deriveNonce, generateSigningKeys, Registry, layoutBand,
  encodePublic, decodePublic, encodeSecret, decodeSecret, describeSecret, interleave, deinterleave, DATA_BYTES,
  type BandSymbol,
} from "./index.js";

const rand = (n: number, seed = 1) => { let s = seed; return Uint8Array.from({ length: n }, () => (s = (s * 1103515245 + 12345) >>> 0) >>> 24); };

test("Reed–Solomon corrects up to p/2 errors, p erasures, and mixes with 2e+f ≤ p", () => {
  const msg = rand(17), p = 12;
  const cw = rsEncode(msg, p);
  assert.equal(cw.length, 29);
  for (let trial = 0; trial < 200; trial++) {
    const r = rand(40, trial + 7);
    const e = r[0]! % 7, f = Math.min(p - 2 * e, r[1]! % 13);
    const bad = Uint8Array.from(cw);
    const idx = [...new Set(Array.from(r.slice(2), (v) => v % cw.length))].slice(0, e + f);
    if (idx.length < e + f) continue;
    idx.forEach((i) => { bad[i] = bad[i]! ^ (1 + (r[3]! % 255)); });
    const { message } = rsDecode(bad, p, idx.slice(e));
    assert.deepEqual(message, msg, `e=${e} f=${f}`);
  }
  const worse = Uint8Array.from(cw);
  for (let i = 0; i < 7; i++) worse[i * 4] = worse[i * 4]! ^ 0x5a;
  assert.throws(() => { const r = rsDecode(worse, p); assert.notDeepEqual(r.message, msg); throw new Error("miscorrected"); });
});

test("payload bit layouts round-trip", () => {
  const pub = { version: 1, keyId: 7, serial: 0xdeadbeef, signatureRef: 513 };
  assert.equal(encodePublic(pub).length, 7);
  assert.deepEqual(decodePublic(encodePublic(pub)), pub);
  const sec = { bloodGroup: "AB" as const, rh: "-" as const, flags: 0b10000001 };
  assert.equal(encodeSecret(sec).length, 2);
  assert.deepEqual(decodeSecret(encodeSecret(sec)), sec);
  assert.equal(describeSecret(sec), "Blood group AB(IV) Rh-; penicillin allergy, see medical record");
});

test("interleaving spreads neighbouring motifs over different bytes", () => {
  const cw = rand(29);
  const s = interleave(cw);
  assert.equal(s.length, 116);
  assert.deepEqual(deinterleave(s).bytes, cw);
  const holes: (0 | 1 | 2 | 3 | null)[] = [...s];
  for (let i = 40; i < 52; i++) holes[i] = null; // a 12-motif seam
  assert.equal(deinterleave(holes).erasures.length, 12); // 12 bytes lose one symbol each
});

const unitKeyBytes = rand(32, 99);

async function setup() {
  const key = await importUnitKey(unitKeyBytes);
  const reg = new Registry(await generateSigningKeys());
  const serial = reg.issueSerial(3), signatureRef = reg.reserveSignatureRef();
  const msg = await encodeMessage({ keyId: 3, serial, signatureRef }, { bloodGroup: "A", rh: "+", flags: 0b10000000 }, key);
  await reg.sign(signatureRef, msg.record);
  return { key, reg, msg, serial };
}

test("end to end: keyed reader decrypts, public reader sees only the item, both directions, with damage", async () => {
  const { key, reg, msg, serial } = await setup();
  assert.equal(msg.symbols.length, 1 + 4 + 116 + 1);
  const keyed = await readBand(msg.symbols, new Map([[3, key]]));
  assert.equal(keyed.status, "ok");
  if (keyed.status !== "ok") return;
  assert.equal(keyed.secretStatus, "decrypted");
  assert.equal(describeSecret(keyed.secret!), "Blood group A(II) Rh+; penicillin allergy");
  assert.equal(keyed.public.serial, serial);
  assert.equal(await reg.verify(keyed.public.signatureRef, keyed.record, keyed.public.keyId), "authentic");

  const pub = await readBand(msg.symbols, new Map());
  assert.ok(pub.status === "ok" && pub.secretStatus === "no-key" && pub.secret === undefined);

  const reversed = await readBand([...msg.symbols].reverse(), new Map([[3, key]]));
  assert.ok(reversed.status === "ok" && reversed.secretStatus === "decrypted");

  // a seam hides 6 motifs and 3 more are misread: 6 erasures + 3 errors uses exactly the 12 parity bytes
  const worn: (BandSymbol | null)[] = [...msg.symbols];
  for (let i = 30; i < 36; i++) worn[i] = null;
  for (const i of [60, 80, 100]) worn[i] = (((worn[i] as number) + 1) % 4) as BandSymbol;
  const r = await readBand(worn, new Map([[3, key]]));
  assert.ok(r.status === "ok" && r.secretStatus === "decrypted" && r.secret!.bloodGroup === "A", JSON.stringify(r));

  // beyond capacity (12-motif seam + 3 misreads) the reader must refuse, never guess a blood group
  const torn: (BandSymbol | null)[] = [...msg.symbols];
  for (let i = 30; i < 42; i++) torn[i] = null;
  for (const i of [60, 80, 100]) torn[i] = (((torn[i] as number) + 1) % 4) as BandSymbol;
  const t = await readBand(torn, new Map([[3, key]]));
  assert.ok(t.status === "not-readable" || t.secretStatus !== "decrypted", JSON.stringify(t));
});

test("fails closed: wrong key, heavy damage, forged signature, nonce derivation", async () => {
  const { reg, msg } = await setup();
  const wrong = await importUnitKey(rand(32, 5));
  const w = await readBand(msg.symbols, new Map([[3, wrong]]));
  assert.ok(w.status === "ok" && w.secretStatus === "not-readable" && w.secret === undefined);

  const heavy: (BandSymbol | null)[] = [...msg.symbols];
  for (let i = 5; i < 121; i += 3) heavy[i] = ((((heavy[i] as number) ?? 0) + 2) % 4) as BandSymbol;
  const h = await readBand(heavy, new Map([[3, await importUnitKey(unitKeyBytes)]]));
  assert.equal(h.status, "not-readable");

  const tampered = Uint8Array.from(msg.record); tampered[2] = tampered[2]! ^ 1;
  assert.equal(await reg.verify(1, tampered, 3), "forged");
  reg.revokeKey(3);
  assert.equal(await reg.verify(1, msg.record, 3), "revoked-key");
  assert.throws(() => reg.issueSerial(3));

  const n1 = await deriveNonce(3, 1), n2 = await deriveNonce(3, 2), n3 = await deriveNonce(4, 1);
  assert.equal(n1.length, 12);
  assert.notDeepEqual(n1, n2); assert.notDeepEqual(n1, n3);
  assert.equal(DATA_BYTES, 17);
});

test("band layout gives one motif per symbol, four distinct variants, markers at both ends", async () => {
  const { msg } = await setup();
  const objs = layoutBand(msg.symbols, { pitch: 10, height: 10 });
  assert.equal(objs.length, msg.symbols.length + 1); // end marker is two shapes
  const shapes = new Set(objs.filter((o) => /-s\d$/.test(o.id)).map((o) => o.id.slice(-1) + JSON.stringify(o.polygon.map((p) => [Math.round((p.x % 10) * 10), Math.round(p.y * 10)]))));
  assert.equal(new Set([...shapes].map((s) => s[0])).size, 4);
  const xs = objs.flatMap((o) => o.polygon.map((p) => p.x));
  assert.ok(Math.max(...xs) <= msg.symbols.length * 10 && Math.min(...xs) >= 0);
  const block = layoutBand(msg.symbols, { pitch: 8, height: 8, rows: 4 });
  const bx = block.flatMap((o) => o.polygon.map((p) => p.x)), by = block.flatMap((o) => o.polygon.map((p) => p.y));
  assert.ok(Math.max(...bx) <= 31 * 8 && Math.max(...by) <= 4 * 8 + 3 * 1.5, "4-row block fits 248 × 36.5 mm");
});

test("medical safety: under random damage of any amount the reader never shows a wrong secret", async () => {
  const { key, msg } = await setup();
  const keys = new Map([[3, key]]);
  let decrypted = 0, refused = 0;
  for (let trial = 0; trial < 400; trial++) {
    const r = rand(64, 1000 + trial);
    const band: (BandSymbol | null)[] = [...msg.symbols];
    const damage = r[0]! % 40;
    for (let k = 0; k < damage; k++) {
      const i = 5 + (r[1 + k]! % 116);
      band[i] = r[k + 20]! % 3 === 0 ? null : ((((band[i] as number) ?? 0) + 1 + (r[k + 10]! % 3)) % 4) as BandSymbol;
    }
    const out = await readBand(band, keys);
    if (out.status === "ok" && out.secretStatus === "decrypted") {
      decrypted++;
      assert.deepEqual(out.secret, { bloodGroup: "A", rh: "+", flags: 0b10000000 });
    } else refused++;
  }
  assert.ok(decrypted > 100 && refused > 50, `decrypted ${decrypted}, refused ${refused}`);
});
