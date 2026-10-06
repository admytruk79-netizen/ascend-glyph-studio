/**
 * Demo: encode "blood group A(II) Rh+, penicillin allergy" under a throwaway test key, lay the band out,
 * stitch it with the stitch engine and read it back from the symbols.
 * Usage: tsx src/demo-band.ts <outDir>
 * The key here is random per run: this is a prototype, not a deployment (docs/SECURE-GLYPH-CODE.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeMessage, generateSigningKeys, importUnitKey, layoutBand, readBand, Registry, describeSecret } from "./index.js";
import { plan, previewSvg, recipes, runGate, estimateMinutes, writeDst } from "../../stitch-engine/src/index.js";

const out = process.argv[2] ?? "out";
const key = await importUnitKey(crypto.getRandomValues(new Uint8Array(32)));
const reg = new Registry(await generateSigningKeys());
const serial = reg.issueSerial(1), signatureRef = reg.reserveSignatureRef();
const msg = await encodeMessage({ keyId: 1, serial, signatureRef }, { bloodGroup: "A", rh: "+", flags: 0b10000000 }, key);
await reg.sign(signatureRef, msg.record);
const objects = layoutBand(msg.symbols, { pitch: 8, height: 8, rows: 4 }); // cuff block: 4 rows × 31 motifs
const r = recipes["linen-180-prewashed"]!;
const p = plan(objects, r);
const gate = runGate(objects, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, estimateMinutes(p, r.speedSpm));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "secure-band.dst"), writeDst(p.commands, { label: "SECURE-DEMO" }));
writeFileSync(join(out, "secure-band.svg"), previewSvg(p.commands, p.colors));
const back = await readBand(msg.symbols, new Map([[1, key]]));
const pub = await readBand(msg.symbols, new Map());
console.log(JSON.stringify({
  motifs: msg.symbols.length, blockMm: `${31 * 8} x ${4 * 8 + 3 * 1.5}`, stitches: p.commands.filter((c) => c.cmd === "stitch").length,
  gateFailures: gate.checks.filter((c) => !c.pass).map((c) => c.id),
  keyedReader: back.status === "ok" && back.secret ? describeSecret(back.secret) : back,
  publicReader: pub.status === "ok" ? `item #${pub.public.serial}, secret: ${pub.secretStatus}` : pub,
  registry: back.status === "ok" ? await reg.verify(back.public.signatureRef, back.record, back.public.keyId) : "-",
}, null, 1));
