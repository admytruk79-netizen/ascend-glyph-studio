import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compensationScale, decodeRecord, encodeRecord, fitWrap, gradeWrap, plan, polygonArea, readDst, recipes,
  runGate, runStitch, satinColumn, tatamiFill, writeDst, dist, inset, estimateMinutes,
  type DesignObject,
} from "./index.js";

const linen = recipes["linen-180-prewashed"]!;

test("DST record encoding round-trips every move in range", () => {
  for (let dx = -121; dx <= 121; dx++)
    for (let dy = -121; dy <= 121; dy += 7) {
      const [b0, b1, b2] = encodeRecord(dx, dy, "stitch");
      const r = decodeRecord(b0, b1, b2);
      assert.deepEqual([r.dx, r.dy, r.kind], [dx, dy, "stitch"]);
    }
  const j = decodeRecord(...encodeRecord(5, -3, "jump"));
  assert.equal(j.kind, "jump");
  assert.equal(decodeRecord(...encodeRecord(0, 0, "color")).kind, "color");
  assert.throws(() => encodeRecord(122, 0, "stitch"));
});

test("DST known vectors (Tajima bit layout)", () => {
  assert.deepEqual(encodeRecord(1, 0, "stitch"), [0b00000001, 0, 0b11]);
  assert.deepEqual(encodeRecord(0, 1, "stitch"), [0b10000000, 0, 0b11]); // file frame: +y is up = bit 7
  assert.deepEqual(encodeRecord(0, -1, "stitch"), [0b01000000, 0, 0b11]);
  assert.deepEqual(encodeRecord(81, 0, "stitch"), [0, 0, 0b111]);
  assert.deepEqual(encodeRecord(0, 0, "jump"), [0, 0, 0b10000011]);
});

test("writeDst/readDst round trip keeps absolute positions without drift and splits long jumps", () => {
  const cmds = [
    { cmd: "jump" as const, x: 0, y: 0 },
    ...Array.from({ length: 400 }, (_, i) => ({ cmd: "stitch" as const, x: i * 0.37, y: Math.sin(i / 9) * 4 })),
    { cmd: "trim" as const, x: 0, y: 0 },
    { cmd: "jump" as const, x: 60, y: 30 },
    { cmd: "color" as const, x: 60, y: 30 },
    { cmd: "stitch" as const, x: 62.5, y: 30 },
  ];
  const buf = writeDst(cmds, { label: "TEST" });
  assert.equal(buf.length % 3, 512 % 3);
  const head = new TextDecoder().decode(buf.subarray(0, 20));
  assert.match(head, /^LA:TEST/);
  const back = readDst(buf);
  assert.equal(back.label, "TEST");
  const st = back.commands.filter((c) => c.cmd === "stitch");
  assert.equal(st.length, 401);
  const last = st[st.length - 1]!;
  assert.ok(Math.abs(last.x - 62.5) < 0.051 && Math.abs(last.y - 30) < 0.051);
  const s399 = st[399]!;
  assert.ok(Math.abs(s399.x - 399 * 0.37) < 0.051, `drift ${s399.x}`);
  assert.equal(back.commands.filter((c) => c.cmd === "color").length, 1);
  assert.equal(back.commands.at(-1)!.cmd, "end");
  assert.throws(() => writeDst([{ cmd: "stitch", x: 0, y: 0 }, { cmd: "stitch", x: 13, y: 0 }]));
});

test("wrap-around: integer repeats within tolerance, n±1, event fallback, fail closed", () => {
  const f = fitWrap({ finishedLength: 250, seamAllowance: 10, closureOverlap: 20, period: 38 });
  assert.equal(f.usableLength, 210);
  // 210/38 = 5.5: n=6 → 35 mm (−7.9%), n=5 → 42 mm (+10.5%), n=7 → 30 mm all fail ±5%, so an event segment absorbs 20 mm
  assert.deepEqual([f.repeats, f.usesEvent, f.eventLength, f.seamAt], [5, true, 20, "event-centre"]);
  const g = fitWrap({ finishedLength: 380, period: 38 });
  assert.deepEqual([g.repeats, g.usesEvent, g.fittedPeriod], [10, false, 38]);
  const h = fitWrap({ finishedLength: 396, period: 38, tolerance: 0.02 });
  assert.ok(h.usesEvent && h.eventLength >= 19 && h.eventLength <= 76, JSON.stringify(h));
  assert.throws(() => fitWrap({ finishedLength: 10, period: 38, tolerance: 0.01 }));
  const grade = gradeWrap({ S: 230, M: 240, L: 250 }, { period: 24, seamAllowance: 8 });
  for (const fit of Object.values(grade)) assert.ok(Math.abs(fit.deviation) <= 0.05 || fit.usesEvent);
});

test("compensation scale", () => {
  assert.equal(compensationScale(0, 0), 1);
  assert.ok(Math.abs(compensationScale(0.02, 0.04) - 1.0625) < 1e-9);
  assert.throws(() => compensationScale(0, 1));
});

test("running stitch respects requested length", () => {
  const s = runStitch([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2.5);
  assert.equal(s.length, 5);
  for (let i = 1; i < s.length; i++) assert.ok(Math.abs(dist(s[i - 1]!, s[i]!) - 2.5) < 1e-9);
});

test("satin column: zigzag width = width + pull comp, density from spacing, underlay by width", () => {
  const center = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
  const narrow = satinColumn(center, 1.5, { spacing: 0.4, pullComp: 0.2, underlay: "none" });
  assert.equal(narrow.length, 51);
  for (const p of narrow) assert.ok(Math.abs(Math.abs(p.y) - 0.85) < 1e-9);
  const withU = satinColumn(center, 1.5, { spacing: 0.4 });
  assert.ok(withU.length > narrow.length); // centre-run underlay added
  const wide = satinColumn(center, 4, { spacing: 0.4 });
  const ys = wide.slice(0, 20).map((p) => Math.abs(p.y));
  assert.ok(ys.every((y) => y <= 1.6 + 1e-9)); // edge-run underlay sits 0.4 mm inside the rail
});

test("tatami fill covers a square at the requested row spacing and stays inside", () => {
  const sq = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }];
  const regions = tatamiFill(sq, { rowSpacing: 0.5, stitchLength: 3, pullComp: 0, underlay: false });
  assert.equal(regions.length, 1);
  const top = regions[0]!;
  const rows = new Set(top.map((p) => p.y.toFixed(3)));
  assert.equal(rows.size, 20);
  for (const p of top) assert.ok(p.x >= -1e-9 && p.x <= 20 + 1e-9 && p.y > 0 && p.y < 10);
  for (let i = 1; i < top.length; i++) if (!top[i]!.turn) assert.ok(dist(top[i - 1]!, top[i]!) >= 1 - 1e-9 && dist(top[i - 1]!, top[i]!) <= 3 + 1e-9);
});

test("tatami fill splits a U shape into regions that never cross the gap", () => {
  const U = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 14 }, { x: 14, y: 14 }, { x: 14, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }];
  const regions = tatamiFill(U, { rowSpacing: 0.5, pullComp: 0, underlay: false });
  assert.ok(regions.length >= 2);
  for (const r of regions) for (let i = 1; i < r.length; i++) {
    const m = { x: (r[i - 1]!.x + r[i]!.x) / 2, y: (r[i - 1]!.y + r[i]!.y) / 2 };
    // the slot between the arms (6 < x < 14, y < 14) must never be crossed
    assert.ok(!(m.x > 6.01 && m.x < 13.99 && m.y < 13.99), `stitch crosses the slot at ${m.x},${m.y}`);
  }
});

test("inset shrinks a square evenly", () => {
  const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const i = inset(sq, 1);
  assert.ok(Math.abs(polygonArea(i) - 64) < 1e-6);
});

const demo: DesignObject[] = [
  { kind: "fill", id: "rhomb", color: "#8b1a1a", polygon: [{ x: 10, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 20 }, { x: 0, y: 10 }], angle: 30 },
  { kind: "satin", id: "rail-top", color: "#1d2a4d", path: [{ x: -5, y: -4 }, { x: 25, y: -4 }], width: 2 },
  { kind: "run", id: "seed", color: "#1d2a4d", path: [{ x: 8, y: 26 }, { x: 12, y: 26 }] },
];

test("plan + gate: tied, trimmed, colour-blocked; prototype recipe fails closed only on validation", () => {
  const p = plan(demo, linen);
  assert.deepEqual(p.colors, ["#8b1a1a", "#1d2a4d"]);
  assert.equal(p.commands.filter((c) => c.cmd === "color").length, 1);
  assert.ok(p.commands.some((c) => c.tie));
  const g = runGate(demo, p.commands, linen, { hoop: { name: "100x100", width: 100, height: 100 }, maxStitches: 20000 }, estimateMinutes(p, linen.speedSpm));
  const failed = g.checks.filter((c) => !c.pass).map((c) => c.id);
  assert.deepEqual(failed, ["recipe-validated"], JSON.stringify(g.checks, null, 1));
  assert.equal(g.release, false);
  const ok = runGate(demo, p.commands, { ...linen, validated: { sewOutId: "SO-1", date: "2026-10-06" } }, { hoop: { name: "100x100", width: 100, height: 100 } }, 1);
  assert.equal(ok.release, true);
  // the DST it produces reads back
  const dst = readDst(writeDst(p.commands));
  assert.equal(dst.commands.filter((c) => c.cmd === "stitch").length, p.commands.filter((c) => c.cmd === "stitch").length);
});

test("gate rejects a too-wide satin, a tiny gap and a small hoop", () => {
  const bad: DesignObject[] = [
    { kind: "satin", id: "fat", color: "#000", path: [{ x: 0, y: 0 }, { x: 30, y: 0 }], width: 9 },
    { kind: "run", id: "near", color: "#000", path: [{ x: 0, y: 5.1 }, { x: 30, y: 5.1 }] },
  ];
  const p = plan(bad, linen);
  const g = runGate(bad, p.commands, linen, { hoop: { name: "tiny", width: 20, height: 20 } }, 1);
  const failed = new Set(g.checks.filter((c) => !c.pass).map((c) => c.id));
  for (const id of ["satin-width", "min-gap", "hoop-fit"]) assert.ok(failed.has(id), id);
});

test("calibration strip: every item stitched, fits a 200x200 hoop, and the gate flags the deliberate limit tests", async () => {
  const { calibrationStrip } = await import("./index.js");
  const { objects, items } = calibrationStrip();
  assert.equal(items.length, 8 + 6 + 5 + 2 + 4 + 4);
  const p = plan(objects, linen);
  const g = runGate(objects, p.commands, linen, { hoop: { name: "200x200", width: 200, height: 200 } }, 1);
  const failed = g.checks.filter((c) => !c.pass).map((c) => c.id).sort();
  // 0.8 mm satin, 0.35/0.38 mm fills and the 0.5 mm gap are limit tests by design
  assert.deepEqual(failed, ["fill-density", "min-gap", "recipe-validated", "satin-width"]);
  assert.equal(g.checks.find((c) => c.id === "hoop-fit")!.pass, true);
  assert.equal(readDst(writeDst(p.commands)).commands.filter((c) => c.cmd === "stitch").length, p.commands.filter((c) => c.cmd === "stitch").length);
});

test("gate: a seed layered on a petal is an overlap, a separate 0.4 mm neighbour is a gap", () => {
  const sq = (x: number, y: number, s: number) => [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
  const minGap = (objs: DesignObject[]) => runGate(objs, plan(objs, linen).commands, linen, { hoop: { name: "200x200", width: 200, height: 200 } }, 1).checks.find((c) => c.id === "min-gap")!;
  const petal: DesignObject = { kind: "fill", id: "petal", color: "#a00", polygon: sq(0, 0, 12) };
  const seed: DesignObject = { kind: "fill", id: "seed", color: "#00a", polygon: sq(5, 5, 2) };
  assert.equal(minGap([petal, seed]).pass, true);
  assert.equal(minGap([petal, seed, { kind: "fill", id: "near", color: "#0a0", polygon: sq(12.4, 0, 6) }]).pass, false);
});

test("tatami: the turn between rows of very different width is split, never a long stitch", () => {
  // a notched shape (like a heart's top): row ends jump sideways across the notch
  const poly = [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 8 }, { x: 14, y: 8 }, { x: 14, y: 20 }, { x: 0, y: 20 }];
  for (const ang of [0, 30, 45, 90]) for (const run of tatamiFill(poly, { angle: ang, rowSpacing: 0.45, stitchLength: 3.5, underlay: false })) for (let i = 1; i < run.length; i++) assert.ok(dist(run[i - 1]!, run[i]!) <= 3.5 + 0.2, `angle ${ang}: stitch ${dist(run[i - 1]!, run[i]!).toFixed(2)} mm`);
});
