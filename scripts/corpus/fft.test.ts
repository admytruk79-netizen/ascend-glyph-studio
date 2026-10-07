import test from "node:test";
import assert from "node:assert/strict";
import { corrAt, crossCorrelate, fft1d } from "./fft.ts";

test("fft round-trips a signal", () => {
  const re = Float64Array.from({ length: 16 }, (_, i) => Math.sin(i) + i / 3), im = new Float64Array(16), orig = Float64Array.from(re);
  fft1d(re, im); fft1d(re, im, true);
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(re[i]! / 16 - orig[i]!) < 1e-9);
});

test("cross-correlation finds the shift between an image and its translate", () => {
  const w = 40, h = 30, img = (ox: number, oy: number) => Float64Array.from({ length: w * h }, (_, i) => {
    const x = i % w, y = Math.floor(i / w);
    return Math.exp(-((x - 15 - ox) ** 2 + (y - 12 - oy) ** 2) / 8);
  });
  const c = crossCorrelate(img(5, 3), img(0, 0), w, h);
  let best = -Infinity, at = [0, 0];
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const v = corrAt(c, dx, dy); if (v > best) { best = v; at = [dx, dy]; } }
  assert.deepEqual(at, [5, 3]);
  assert.ok(best > 0.95);
});
