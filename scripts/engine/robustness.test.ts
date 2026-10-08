/**
 * The engine must not break: every generator, across sizes from tiny to large, odd seeds and broken or empty
 * grammars, either returns stitchable geometry (finite coordinates, passes the stitch gate) or returns nothing
 * (fail closed). It never throws and never hands back geometry that fails the gate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { composeBand, blendGrammars, SIGNATURE_GRAMMAR, type LegoGrammar } from "../../packages/blend-engine/src/lego-compose.ts";
import { fieldBand, fieldPanel } from "../../packages/blend-engine/src/field.ts";
import { signatureBand, signaturePanel } from "../../packages/blend-engine/src/signature-style.ts";
import { plan, recipes, runGate, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const roles = { main: "#b3332b", dark: "#1f2c4c", leaf: "#4f6b3a", light: "#d39b35", accent: "#2b8796" };
const r = recipes["linen-180-prewashed"]!;
const finite = (objs: DesignObject[]) => objs.every((o) => (o.kind === "fill" ? o.polygon : o.path).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
const gateFails = (objs: DesignObject[]) => { const p = plan(objs, r); return runGate(objs, p.commands, r, { hoop: { name: "any", width: 2000, height: 2000 } }, 1).checks.filter((c) => !c.pass && c.id !== "recipe-validated" && c.id !== "hoop-fit").map((c) => c.id); };

const GRAMMARS: Record<string, LegoGrammar> = {
  empty: { images: 0, bricks: {}, pairs: {}, mirrorV: 0 },
  unknownBricks: { images: 3, bricks: { "not-a-brick": { share: 1, perImage: 2, extent: 0.1 }, tree: { share: 0, perImage: 0, extent: 0.1 } }, pairs: { "tree|not-a-brick": { n: 5, dx: 1, dy: 0, ratio: 0.5 } }, mirrorV: 0.5 },
  nanValues: { images: 1, bricks: { tree: { share: NaN, perImage: NaN, extent: NaN }, bird: { share: 1, perImage: 1, extent: 0.1 } }, pairs: { "tree|bird": { n: 3, dx: NaN, dy: NaN, ratio: NaN } }, mirrorV: NaN },
  signature: blendGrammars({ images: 0, bricks: {}, pairs: {}, mirrorV: 0 }, SIGNATURE_GRAMMAR, 1),
  learnedOnly: { images: 5, bricks: { horns: { share: 1, perImage: 1, extent: 0.1 } }, pairs: {}, mirrorV: 0, learned: [{ id: "learned-1", outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], share: 1, aspect: 1 }] },
};

test("bands: any grammar, size and seed gives a stitchable band or nothing", () => {
  for (const [name, g] of Object.entries(GRAMMARS)) for (const [L, H] of [[250, 60], [120, 30], [600, 90], [40, 12]]) for (const seed of ["a", "ü-ñ-🙂", "x".repeat(200)]) for (const fill of [0, 20, true] as const) {
    const out = composeBand(g, { seed, roles, length: L, height: H, fill });
    if (out === null) continue;
    assert.ok(finite(out.kit.objs), `${name} ${L}x${H} ${seed.slice(0, 5)}: non-finite geometry`);
    assert.deepEqual(gateFails(out.kit.objs), [], `${name} ${L}x${H} seed ${seed.slice(0, 5)} fill ${fill}`);
  }
});

test("fields: any size and seed gives a stitchable field or nothing", () => {
  for (const [w, h] of [[130, 200], [60, 60], [300, 400], [20, 20], [250, 30]]) for (const seed of ["a", "b", "", "🙂"]) {
    for (const out of [fieldPanel(w, h, { seed, roles }), fieldBand(w, Math.min(h, 90), { seed, roles })]) {
      if (out === null) continue;
      assert.ok(finite(out.kit.objs), `field ${w}x${h}: non-finite geometry`);
      assert.deepEqual(gateFails(out.kit.objs), [], `field ${w}x${h} seed ${seed}`);
    }
  }
});

test("signature panels and bands: any size gives stitchable geometry or nothing", () => {
  for (const [w, h] of [[130, 200], [80, 120], [200, 300], [30, 40]]) {
    const out = signaturePanel(w, h);
    if (out === null) continue;
    assert.ok(finite(out.objs)); assert.deepEqual(gateFails(out.objs), [], `signature panel ${w}x${h}`);
  }
  for (const [L, H] of [[250, 60], [150, 40], [400, 80], [40, 15]]) {
    const out = signatureBand(L, H);
    if (out === null) continue;
    assert.ok(finite(out.objs)); assert.deepEqual(gateFails(out.objs), [], `signature band ${L}x${H}`);
  }
});
