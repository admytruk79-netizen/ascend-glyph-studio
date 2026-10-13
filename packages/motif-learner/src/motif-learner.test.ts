import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composeBand } from "./band.ts";
import { leaveOneGroupOut } from "./evaluate.ts";
import { extractGrid, renderPixels } from "./extract.ts";
import { generate, generateShape, nearestReference } from "./generate.ts";
import { crop, parseChart, same, toChart } from "./grid.ts";
import { admit, fit, logLikelihood, select, type MotifRecord } from "./model.ts";
import { toDesignObjects } from "./stitch.ts";
import { detectSymmetry, orbits } from "./symmetry.ts";

const seed = (JSON.parse(readFileSync(new URL("../../../data/motifs/ua-seed-motifs.v1.json", import.meta.url), "utf8")) as { records: MotifRecord[] }).records;
const { model } = fit(seed);
const ua = select(model, "Ukrainian");

test("seed charts are read as the symmetry they were drawn with", () => {
  const groups = Object.fromEntries(seed.map((r) => [r.id, detectSymmetry(parseChart(r.chart))]));
  assert.equal(groups["ua-seed-sown-rhomb"], "d4");
  assert.equal(groups["ua-seed-tulip"], "mirror-v");
  assert.equal(groups["ua-seed-rose"], "d2");
});

test("generated motifs carry exactly the symmetry they were sampled under", () => {
  for (const [group, expect] of [["d4", ["d4"]], ["mirror-v", ["mirror-v", "d2", "d4"]], ["c4", ["c4", "d4"]]] as const) {
    const { grid } = generateShape(ua, { seed: 5, size: 13, group, iterations: 4000 });
    assert.ok((expect as readonly string[]).includes(detectSymmetry(grid, 1)), `${group} → ${detectSymmetry(grid, 1)}`);
  }
  for (const cells of orbits("d4", 5, 5)) assert.ok(cells.length >= 1 && cells.length <= 8);
});

test("admission fails closed on licence and cultural access; structure-only trains shape but not colour", () => {
  const base = seed[0]!;
  const mk = (id: string, p: Partial<MotifRecord["provenance"]>): MotifRecord => ({ ...base, id, provenance: { ...base.provenance, ...p } });
  const { admitted, excluded } = admit([mk("a", { licence: "CC-BY-NC-ND" }), mk("b", { culturalAccess: "restricted" }), mk("c", { culturalAccess: "review" }), mk("d", { licence: "unreviewed" }), mk("e", { culturalAccess: "structure-only" })]);
  assert.deepEqual(excluded.map((e) => e.id), ["a", "b", "c", "d"]);
  assert.equal(admitted.length, 1);
  assert.equal(admitted[0]!.colour, false);
  assert.equal(fit([mk("e", { culturalAccess: "structure-only" })]).model.traditions.Ukrainian!.colour, null);
});

test("on held-out motifs the learned model beats the independent-cell baseline, and says how little data it has", () => {
  const ev = leaveOneGroupOut(seed);
  assert.equal(ev.folds, seed.length);
  assert.equal(ev.wins, ev.heldOut.length);
  assert.ok(ev.meanGain > 0.3, `gain ${ev.meanGain}`);
  assert.equal(ev.independentSourceGroups, 0);
  assert.match(ev.caveat ?? "", /not that it has learned a tradition/);
});

test("traditions are fitted and queried separately, never pooled", () => {
  const stripes: MotifRecord[] = [0, 1, 2, 3].map((k) => ({ ...seed[0]!, id: `s${k}`, sourceGroup: `s${k}`, tradition: "Stripes", chart: Array.from({ length: 9 }, () => "R.R.R.R.R".slice(0, 9 - (k % 2)) + (k % 2 ? "." : "")) }));
  const both = fit([...seed, ...stripes]).model;
  assert.throws(() => select(both, "Hutsul"), /tradition-not-trained/);
  const st = select(both, "Stripes"), u = select(both, "Ukrainian"), g = parseChart(stripes[0]!.chart);
  assert.ok(logLikelihood(g, st) > logLikelihood(g, u));
});

test("generation is deterministic, new, and rejects near-copies", () => {
  const a = generate(ua, model.dataset, { count: 3, seed: 9 }), b = generate(ua, model.dataset, { count: 3, seed: 9 });
  assert.deepEqual(a.accepted.map((c) => toChart(c.grid)), b.accepted.map((c) => toChart(c.grid)));
  assert.equal(a.accepted.length, 3);
  for (const c of a.accepted) { assert.ok(c.nearest.iou < 0.8); assert.ok(c.logLikelihood >= ua.plausibilityFloor); assert.equal(c.lineage.dataset, model.dataset); }
  assert.equal(nearestReference(parseChart(seed[0]!.chart), ua.references).iou, 1);
  const strict = generate(ua, model.dataset, { count: 2, seed: 9, maxIoU: 0.01 });
  assert.ok(strict.rejected.some((r) => r.reason === "near-copy"));
});

test("a rendered, noisy chart image is read back to the same counted grid", () => {
  for (const r of seed.slice(0, 4)) {
    const g = parseChart(r.chart), out = extractGrid(renderPixels(g, 9, 18, 3));
    assert.ok(out, r.id);
    assert.deepEqual(out.pitch, [9, 9]);
    assert.ok(same(out.grid, crop(g)), `${r.id}\n${toChart(out.grid).join("\n")}`);
  }
  assert.equal(extractGrid({ width: 64, height: 64, data: new Uint8Array(64 * 64 * 3).fill(200), channels: 3 }), null);
});

test("cross-stitch paths give every cell both diagonals, one path per same-thread row run", () => {
  const g = parseChart(["RRK", ".R."]), objs = toDesignObjects(g, { pitchXmm: 2 });
  assert.equal(objs.length, 3);
  const row = objs[0]!;
  assert.ok(row.kind === "run");
  const segs = row.path.slice(1).map((q, i) => ({ p: row.path[i]!, q }));
  for (const cx of [0, 1]) for (const [from, to] of [[[cx, 1], [cx + 1, 0]], [[cx + 1, 1], [cx, 0]]] as [number, number][][]) {
    assert.ok(segs.some(({ p, q }) => p.x === from![0] * 2 && p.y === from![1] * 2 && q.x === to![0] * 2 && q.y === to![1] * 2), `cell ${cx} leg ${from}→${to}`);
  }
});

test("bands follow the grammar string with rails", () => {
  const A = parseChart(["R"]), B = parseChart(["KK"]);
  const band = composeBand([A, B], "A A | B", { gap: 1, voidGap: 2 });
  assert.deepEqual(toChart(band), ["KKKKKKKKKKK", "...........", ".R.R....KK.", "...........", "KKKKKKKKKKK"]);
});

test("a generated motif stitches through the stitch engine; only the missing sew-out blocks release", async () => {
  const { estimateMinutes, plan, recipes, runGate } = await import("../../stitch-engine/src/index.ts");
  const c = generate(ua, model.dataset, { count: 1, seed: 11 }).accepted[0]!;
  const objs = toDesignObjects(c.grid, { pitchXmm: 2 }), r = recipes["linen-180-prewashed"]!, p = plan(objs, r);
  const gate = runGate(objs, p.commands, r, { hoop: { name: "100x100", width: 100, height: 100 }, maxStitches: 60000, maxMinutes: 60 }, estimateMinutes(p, r.speedSpm));
  assert.deepEqual(gate.checks.filter((k) => !k.pass).map((k) => k.id), ["recipe-validated"]);
  assert.equal(gate.release, false);
});

test("fractal: box-counting dimension reads a line as ~1 and a filled square as ~2", async () => {
  const { boxCountingDimension } = await import("./fractal.ts");
  assert.ok(Math.abs(boxCountingDimension(parseChart(["R".repeat(32)].concat(Array(31).fill(".".repeat(32))))) - 1) < 0.05);
  assert.ok(Math.abs(boxCountingDimension(parseChart(Array(32).fill("R".repeat(32)))) - 2) < 0.05);
});

test("fractal: every stitched layout cell becomes an element copy taking the layout's thread", async () => {
  const { compose } = await import("./fractal.ts");
  const g = compose(parseChart(["R.", ".K"]), parseChart([".R.", "RYR", ".R."]), 1);
  assert.deepEqual(toChart(g), [".R.....", "RYR....", ".R.....", ".......", ".....K.", "....KYK", ".....K."]);
});

test("fractal: decorated self-similar motifs keep exact symmetry, are new, and are deterministic", async () => {
  const { generateFractal } = await import("./fractal.ts");
  for (const group of ["d4", "mirror-v"] as const) {
    const a = generateFractal(ua, { seed: 202, group }), b = generateFractal(ua, { seed: 202, group });
    assert.deepEqual(toChart(a.grid), toChart(b.grid));
    const read = detectSymmetry(a.grid, 1);
    assert.ok(group === "d4" ? read === "d4" : ["mirror-v", "d2", "d4"].includes(read), `${group} → ${read}`);
    assert.ok(a.nearest.iou < 0.5);
    assert.ok(a.decoration);
    assert.ok(a.dimension > 0.5 && a.dimension < 2);
  }
});

test("reader: cloth tone and uneven lighting are ground; fuzzy, low-contrast images are rejected", () => {
  for (const r of seed.slice(0, 4)) {
    const g = parseChart(r.chart), out = extractGrid(renderPixels(g, 11, 14, 5, { ground: "#e3d3a8", gradient: 0.18 }));
    assert.ok(out, r.id);
    assert.ok(same(out.grid, crop(g)), `${r.id}\n${toChart(out.grid).join("\n")}`);
  }
  // a faded print: thread colours pulled towards the ground, heavy noise → no confident read
  const faded = renderPixels(parseChart(seed[0]!.chart), 11, 70, 9, { ground: "#c9b48a" });
  assert.equal(extractGrid(faded), null);
});

test("quality filter: real motifs pass; lines, scatter, specks and solid fills are rejected", async () => {
  const { motifQuality } = await import("./quality.ts");
  for (const r of seed) assert.ok(motifQuality(parseChart(r.chart)).passes, r.id);
  const diag = Array.from({ length: 20 }, (_, y) => ".".repeat(y) + "R" + ".".repeat(19 - y));
  assert.ok(motifQuality(parseChart(diag)).reasons.includes("thin-line"));
  const scatter = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => ((x * 7 + y * 13) % 5 === 0 && x % 2 === 0 ? "Y" : ".")).join(""));
  assert.ok(motifQuality(parseChart(scatter)).reasons.includes("scattered"));
  assert.ok(motifQuality(parseChart(Array(12).fill("Y".repeat(12)))).reasons.includes("solid-fill"));
  const blob = Array.from({ length: 14 }, (_, y) => Array.from({ length: 14 }, (_, x) => ((x - 6.5) ** 2 + (y - 6.5) ** 2 < 49 ? "K" : ".")).join(""));
  assert.ok(motifQuality(parseChart(blob)).reasons.includes("single-colour-fill"));
  assert.ok(motifQuality(parseChart(["RR", "RR"])).reasons.includes("too-small"));
});
