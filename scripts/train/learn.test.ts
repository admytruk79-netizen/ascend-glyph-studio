import { test } from "node:test";
import assert from "node:assert/strict";
import { featureOf, kmeans, learnImage, prototypeShape } from "./learn.ts";

/** Synthetic embroidery: red four-point stars and blue rhombs on a linen ground. */
function synthetic(w = 160, h = 80) {
  const d = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) d.set([239, 233, 220], i * 3);
  const put = (x: number, y: number, c: number[]) => d.set(c, (y * w + x) * 3);
  for (let k = 0; k < 4; k++) {
    const cx = 20 + k * 40, cy = 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      if (k % 2 === 0 && (dx * dy < 18 && dx + dy < 16)) put(x, y, [179, 51, 43]);   // star: thin cross arms
      if (k % 2 === 1 && dx / 9 + dy / 14 <= 1) put(x, y, [31, 44, 76]);              // rhomb
    }
  }
  return { data: d, width: w, height: h };
}

test("learnImage finds the ground, the thread colours and both kinds of element", () => {
  const L = learnImage(synthetic());
  assert.ok(L.ground[0] > 220, "linen ground");
  assert.equal(L.elements.length, 4);
  const stars = L.elements.filter((e) => e.color[0] > 150), rhombs = L.elements.filter((e) => e.color[2] > 60 && e.color[0] < 60);
  assert.equal(stars.length, 2); assert.equal(rhombs.length, 2);
  // the star is spikier (lower solidity) than the rhomb; both read as 4-fold or mirrored shapes
  assert.ok(stars[0]!.solidity < rhombs[0]!.solidity);
  assert.ok(rhombs.every((e) => e.mirror > 0.8));
});

test("clustering separates the two element kinds and prototypes are unit-box polygons", () => {
  const L = learnImage(synthetic());
  const { assign } = kmeans(L.elements.map(featureOf), 2);
  const byColour = L.elements.map((e) => (e.color[0] > 150 ? 0 : 1));
  assert.ok(assign.every((a, i) => (a === assign[0]) === (byColour[i] === byColour[0])));
  const shape = prototypeShape(L.elements.filter((e) => e.color[0] > 150));
  assert.equal(shape.length, 48);
  assert.ok(shape.every(([x, y]) => Math.abs(x) <= 0.51 && Math.abs(y) <= 0.51));
});

test("region comes from the catalogue text", async () => {
  const { regionOf } = await import("./labels.ts");
  assert.equal(regionOf({ title: "Women's shirt, Poltava governorate, 19th c." }), "Poltava");
  assert.equal(regionOf({ title: "Гуцульська сорочка" }), "Hutsul");
  assert.equal(regionOf({ title: "Вишивка хрестиком 02", region: "Ukraine" }), undefined);
});
