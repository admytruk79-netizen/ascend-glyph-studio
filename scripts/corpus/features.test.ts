import test from "node:test";
import assert from "node:assert/strict";
import { dHash, dHashVertical, hamming, NearDuplicateIndex, structuralFeatures } from "./features.ts";

const W = 128, H = 128;
const img = (fn: (x: number, y: number) => number) => {
  const data = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = fn(x, y);
  return { data, width: W, height: H };
};

test("horizontal bands read as a horizontal axis with vertical repetition", () => {
  const f = structuralFeatures(img((_, y) => (Math.floor(y / 8) % 2 ? 230 : 20)));
  assert.equal(f.dominantAxis, "horizontal");
  assert.ok(f.repetitionY > 0.9, `repetitionY ${f.repetitionY}`);
  // Band edges recur every 8px (each light/dark boundary).
  assert.ok(Math.abs(f.periodY - 8 / H) < 0.01, `periodY ${f.periodY}`);
  assert.ok(f.mirrorX > 0.99);
});

test("radial rays score higher radiality than concentric rings", () => {
  const rays = structuralFeatures(img((x, y) => (Math.floor(((Math.atan2(y - 63.5, x - 63.5) + Math.PI) / (2 * Math.PI)) * 16) % 2 ? 230 : 20)));
  const rings = structuralFeatures(img((x, y) => (Math.floor(Math.hypot(x - 63.5, y - 63.5) / 8) % 2 ? 230 : 20)));
  assert.ok(rays.radiality > 0.7, `rays ${rays.radiality}`);
  assert.ok(rings.radiality < 0.3, `rings ${rings.radiality}`);
  assert.ok(rings.rotation180 > 0.95);
});

test("an empty field has no edges and a full void ratio", () => {
  const f = structuralFeatures(img(() => 128));
  assert.equal(f.edgeDensity, 0);
  assert.equal(f.voidRatio, 1);
  assert.equal(f.contrast, 0);
});

test("asymmetric composition scores lower mirror symmetry than a symmetric one", () => {
  const asym = structuralFeatures(img((x, y) => (x < 40 && y < 90 ? 230 : 20)));
  const sym = structuralFeatures(img((x) => (Math.abs(x - 64) < 20 ? 230 : 20)));
  assert.ok(sym.mirrorX > asym.mirrorX);
});

test("dHash and near-duplicate index catch small changes but not different images", () => {
  const a = { data: Uint8Array.from({ length: 72 }, (_, i) => (i * 37) % 251), width: 9, height: 8 };
  const b = { ...a, data: Uint8Array.from(a.data, (v, i) => (i === 5 ? v + 1 : v)) };
  const c = { ...a, data: Uint8Array.from(a.data, (v) => 255 - v) };
  const ha = dHash(a), hb = dHash(b), hc = dHash(c);
  assert.equal(ha.length, 16);
  assert.ok(hamming(ha, hb) <= 1);
  const idx = new NearDuplicateIndex(3);
  assert.equal(idx.findOrAdd(ha), undefined);
  assert.equal(idx.findOrAdd(hb), ha);
  assert.equal(idx.findOrAdd(hc), undefined);
});

test("vertical hash separates horizontally banded images that the horizontal hash cannot", () => {
  const bands = (period: number) => ({ data: Uint8Array.from({ length: 72 }, (_, i) => (Math.floor(i / 8 / period) % 2 ? 220 : 30)), width: 8, height: 9 });
  assert.notEqual(dHashVertical(bands(1)), dHashVertical(bands(3)));
  const idx = new NearDuplicateIndex(6);
  assert.throws(() => new NearDuplicateIndex(4).findOrAdd("0000000000000000"));
  assert.equal(idx.findOrAdd("0".repeat(16) + dHashVertical(bands(1))), undefined);
  assert.equal(idx.findOrAdd("0".repeat(16) + dHashVertical(bands(3))), undefined);
});

test("Commons licences: PD, CC0 and CC BY are open; share-alike and NC go to review", async () => {
  const { commonsRights } = await import("./sources.ts");
  assert.equal(commonsRights("Public domain"), "open");
  assert.equal(commonsRights("CC0"), "open");
  assert.equal(commonsRights("CC BY 4.0"), "open");
  assert.equal(commonsRights("CC BY-SA 4.0"), "review");
  assert.equal(commonsRights("CC BY-NC 2.0"), "review");
  assert.equal(commonsRights(undefined), "unknown");
});
