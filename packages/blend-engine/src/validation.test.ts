import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, type Request } from "./generate.js";

const valid = (): Request => ({
  weights: { Ukrainian: 1 },
  meanings: ["growth"],
  zone: { name: "sleeve", finishedLength: 240, height: 40 },
  seed: 17,
});

test("rejects nonfinite and negative synthesis weights", () => {
  for (const weight of [NaN, Infinity, -1]) {
    const req = valid();
    req.weights.Ukrainian = weight;
    assert.throws(() => generate(req), /weights/);
  }
});

test("rejects impossible or nonfinite garment geometry", () => {
  for (const length of [0, -1, NaN, Infinity]) {
    const req = valid();
    req.zone.finishedLength = length;
    assert.throws(() => generate(req), /zone dimensions/);
  }
  const req = valid();
  req.zone.seamAllowance = 120;
  assert.throws(() => generate(req), /seam allowance/);
});

test("rejects invalid counts, seeds and research profiles", () => {
  assert.throws(() => generate(valid(), -1), /count/);
  assert.throws(() => generate(valid(), 1.5), /count/);
  assert.throws(() => generate({ ...valid(), seed: Infinity }), /seed/);
  assert.throws(() => generate({ ...valid(), profiles: [{ tradition: "Ukrainian", n: 30, frieze: { p1: NaN } }] }), /profile/);
});
