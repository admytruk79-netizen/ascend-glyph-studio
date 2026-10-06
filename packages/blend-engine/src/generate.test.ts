import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, mixFrieze, type Request } from "./generate.js";
import { friezeCell, FRIEZE_GROUPS } from "./symmetry.js";
import { UNIT_MOTIFS } from "./motifs.js";
import { readBackGroup, feasibility } from "./check.js";

const cuff = { name: "cuff band", finishedLength: 250, height: 30, seamAllowance: 10, closureOverlap: 18 };

test("every frieze group built by the generator is read back as the same group by the analyser", () => {
  const bad: string[] = [];
  for (const [name, m] of Object.entries(UNIT_MOTIFS)) for (const g of FRIEZE_GROUPS) {
    const cell = friezeCell(m.polys, g);
    const period = 24, inner = 24;
    const shapes = Array.from({ length: 8 }, (_, i) => cell.map((p) => ({ id: "a", role: "motif" as const, color: "#000", poly: p.map((q) => ({ x: i * period + q.x * period, y: q.y * inner })) }))).flat();
    const c = { repeats: 8, period, shapes } as any;
    const back = readBackGroup(c, inner);
    if (back.group !== g) bad.push(`${name} ${g}→${back.group} ${JSON.stringify(back.scores)}`);
  }
  assert.deepEqual(bad, []);
});

test("request → candidates: weights mix symmetry, meanings pick motifs, wrap fits, lineage is complete", () => {
  const req: Request = { weights: { Ukrainian: 50, "Western / cowboy material culture": 25, "Native American (structure only)": 15 }, meanings: ["protection", "family", "ascent"], zone: cuff, seed: 7 };
  const { dist, source } = mixFrieze(req);
  assert.equal(source, "literature-priors");
  assert.ok(Math.abs(Object.values(dist).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  const cands = generate(req, 6);
  assert.equal(cands.length, 6);
  for (const c of cands) {
    assert.ok(["p1m1", "p2mm", "p2mg"].includes(c.group), "family → a mirrored group");
    assert.ok(c.rails, "protection → enclosing rails");
    const usable = 250 - 20 - 18;
    const span = c.repeats * c.period + (c.event ? 30 - 2 * 3.7 : 0) * 1.25;
    assert.ok(Math.abs(span - usable) < 0.5, `wrap: ${span} vs ${usable}`);
    assert.deepEqual(c.lineage.structureOnly, ["Native American (structure only)"]);
    assert.notEqual(c.palette.motif, undefined);
    assert.ok(c.lineage.meaning.every((m) => m.semantics.length > 0));
  }
  assert.ok(new Set(cands.map((c) => c.motif.id)).size >= 2, "ascent and protection give different motifs");
  assert.throws(() => generate({ ...req, weights: { Navajo: 1 } }), /unknown tradition/);
});

test("measured profiles override priors once a tradition has 30+ objects", () => {
  const req: Request = { weights: { Ukrainian: 1 }, meanings: ["sun"], zone: cuff, profiles: [{ tradition: "Ukrainian", n: 400, frieze: { p2: 1 } }] };
  const { dist, source } = mixFrieze(req);
  assert.equal(source, "measured-profiles");
  assert.deepEqual(dist, { p2: 1 });
});

test("generated cuff candidates read back correctly and pass the stitch gate except the pending sew-out", () => {
  const cands = generate({ weights: { Ukrainian: 3, "Western / cowboy material culture": 1 }, meanings: ["protection", "fertility"], zone: cuff, seed: 3 }, 4);
  for (const c of cands) {
    assert.equal(readBackGroup(c, 30).group, c.group, `${c.id} ${c.group}`);
    const f = feasibility(c);
    const failed = f.gate.checks.filter((x) => !x.pass).map((x) => x.id);
    assert.deepEqual(failed, ["recipe-validated"], `${c.id}: ${JSON.stringify(f.gate.checks.filter((x) => !x.pass))}`);
  }
});
