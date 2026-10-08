import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { composeBand } from "../../packages/blend-engine/src/lego-compose.ts";
import { plan, recipes, runGate } from "../../packages/stitch-engine/src/index.ts";
import { assemble, brickSignatures, grammarOf, learnedBricks, scalesOf, type Assembly } from "./lego.ts";

const read = async (id: string) => {
  const r = await sharp(readFileSync(`originals/designs/rich-bands/${id}-board.svg`), { density: 150 }).resize({ width: 1500 }).flatten({ background: "#efe6d2" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: r.data, width: r.info.width, height: r.info.height };
};
const count = (a: Assembly, b: string) => a.pieces.filter((p) => p.brick === b).length;

test("reads known bands as their pieces", async () => {
  const sigs = await brickSignatures(), sc = scalesOf(sigs);
  const roots = assemble(await read("01-ascend-roots"), sigs, sc);
  assert.equal(count(roots, "tree"), 4); assert.equal(count(roots, "bird"), 8);
  const path = assemble(await read("02-mountain-path"), sigs, sc);
  assert.equal(count(path, "horns"), 4); assert.equal(count(path, "rhomb-frame"), 4);
  const sky = assemble(await read("04-sky-horizon"), sigs, sc);
  assert.equal(count(sky, "rose"), 5);
  assert.ok(roots.mirrorV > 0.5, "trees between facing birds mirror");
  assert.ok(roots.repeats.some((r) => r.brick === "tree" && r.regularity > 0.9), "trees repeat regularly");
});

test("composes stitchable bands from a grammar", async () => {
  const sigs = await brickSignatures(), sc = scalesOf(sigs);
  const g = grammarOf([assemble(await read("01-ascend-roots"), sigs, sc), assemble(await read("02-mountain-path"), sigs, sc)]);
  const roles = { main: "#b3332b", dark: "#1f2c4c", leaf: "#4f6b3a", light: "#d39b35", accent: "#2b8796" };
  const a = composeBand(g, { seed: "t1", roles })!, b = composeBand(g, { seed: "t1", roles })!;
  assert.deepEqual(a.plan, b.plan, "same seed, same band");
  assert.ok(["tree", "horns", "rhomb-frame"].includes(a.plan.hero));
  const r = recipes["linen-180-prewashed"]!, p = plan(a.kit.objs, r);
  const failed = runGate(a.kit.objs, p.commands, r, { hoop: { name: "border", width: 360, height: 100 } }, 30).checks.filter((c) => !c.pass && c.id !== "recipe-validated");
  assert.deepEqual(failed.map((c) => c.id), []);
});

test("learns a new brick from pieces no brick matches", () => {
  // the same unmatched teardrop in 60 images, plus noise pieces: one learned brick, drawn from the teardrop's outline
  const tear = Array.from({ length: 64 }, (_, i) => +(1 + 0.45 * Math.cos((2 * Math.PI * i) / 64)).toFixed(2));
  const f = [1, 0.4, 0.1, 0.05, 0.02, 0.01, 0.01, 0, 0, 0, 0.6, 0.8, 0.3];
  const as: Assembly[] = Array.from({ length: 60 }, (_, i) => ({ pieces: [{ brick: "novel", d: 2, x: 0.5, y: 0.5, extent: 0.1, angle: 0, color: "#b3332b", f: f.map((v) => v + (i % 5) * 0.002), profile: tear }], pairs: [], mirrorV: 0, mirrorH: 0, repeats: [] }));
  const learned = learnedBricks(as, 3, 25);
  assert.equal(learned.length, 1);
  assert.ok(learned[0]!.outline.length >= 24 && learned[0]!.share === 1);
});
