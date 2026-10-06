import test from "node:test";
import assert from "node:assert/strict";
import { classifyFriezeGroup, deconstruct, detectBands, detectBreaks, findRepeatUnit, segmentStrip, toGrammar } from "./deconstruct.ts";

// Asymmetric 8x8 glyph ("F"-like) so every symmetry is something we placed on purpose.
const G = ["#####...", "#.......", "###.....", "#.......", "#.......", "#.......", "........", "........"];
const fx = (g: string[]) => g.map((r) => [...r].reverse().join(""));
const fy = (g: string[]) => [...g].reverse();
const r180 = (g: string[]) => fx(fy(g));
const BG = 0.1, INK = 0.9;

/** Band of height 16 built from a period-wide cell of placed 8x8 glyphs, repeated across `w`. */
function band(period: number, place: [string[], number, number][], w = 128) {
  const h = 16, f = new Float64Array(w * h).fill(BG);
  for (let x0 = 0; x0 < w; x0 += period) for (const [g, ox, oy] of place)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (g[y]![x] === "#" && x0 + ox + x < w) f[(oy + y) * w + x0 + ox + x] = INK;
  return { f, w, h };
}

const cases: [string, number, [string[], number, number][]][] = [
  ["p1", 16, [[G, 0, 0]]],
  ["p11m", 16, [[G, 0, 0], [fy(G), 0, 8]]],
  ["p1m1", 16, [[G, 0, 0], [fx(G), 8, 0]]],
  ["p11g", 16, [[G, 0, 0], [fy(G), 8, 8]]],
  ["p2", 16, [[G, 0, 0], [r180(G), 8, 8]]],
  ["p2mm", 16, [[G, 0, 0], [fx(G), 8, 0], [fy(G), 0, 8], [r180(G), 8, 8]]],
  ["p2mg", 32, [[G, 0, 0], [fx(G), 8, 0], [fy(G), 16, 8], [r180(G), 24, 8]]],
];

for (const [group, period, place] of cases) {
  test(`frieze group ${group} is recognized`, () => {
    const { f, w, h } = band(period, place);
    const r = classifyFriezeGroup(f, w, h, period);
    assert.equal(r.group, group, JSON.stringify(r.scores));
  });
}

test("repeat unit: square lattice of dots", () => {
  const w = 96, h = 96, f = new Float64Array(w * h).fill(BG);
  for (let y = 4; y < h; y += 16) for (let x = 4; x < w; x += 16) for (let d = 0; d < 9; d++) f[(y + Math.floor(d / 3)) * w + x + (d % 3)] = INK;
  const r = findRepeatUnit(f, w, h);
  assert.equal(r.kind, "lattice");
  if (r.kind === "lattice") {
    assert.equal(r.latticeType, "square");
    assert.equal(Math.round(Math.hypot(...r.a)), 16);
  }
});

test("repeat unit: 1D stripes have a single translation", () => {
  const w = 96, h = 64, f = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[y * w + x] = Math.floor(x / 6) % 2 ? INK : BG;
  const r = findRepeatUnit(f, w, h);
  assert.equal(r.kind, "1d");
  if (r.kind === "1d") assert.equal(Math.abs(r.a[0]), 12);
});

test("bands: a border band above a plain field is found with its period", () => {
  const b = band(16, [[G, 0, 0], [fx(G), 8, 0]]), w = 128, h = 96, f = new Float64Array(w * h).fill(BG);
  for (let y = 0; y < 16; y++) for (let x = 0; x < w; x++) f[(10 + y) * w + x] = b.f[y * w + x]!;
  const bands = detectBands(f, w, h);
  assert.ok(bands.length >= 1);
  assert.equal(bands[0]!.orientation, "horizontal");
  assert.ok(Math.abs(bands[0]!.period - 16) < 0.25, String(bands[0]!.period));
});

test("grammar and breaks: AAAA | B | AAA is an event; a blank segment is a passage", () => {
  const { f, w, h } = band(16, [[G, 0, 0]]);
  const segs = segmentStrip(f, w, h, 16);
  const odd = Float64Array.from(segs[4]!);
  for (let i = 0; i < odd.length; i++) odd[i] = (i * 7) % 5 ? INK : BG;
  const withEvent = [...segs.slice(0, 4), odd, ...segs.slice(5)];
  const g = toGrammar(withEvent);
  assert.equal(g.sequence, "AAAABAAA");
  assert.equal(g.notation, "AAAA | B | AAA");
  assert.ok(g.figures.includes("event"));
  const br = detectBreaks(withEvent);
  assert.deepEqual(br.positions, [4]);
  const blank = new Float64Array(segs[0]!.length).fill(BG);
  const withVoid = [...segs.slice(0, 3), blank, ...segs.slice(4)];
  assert.ok(toGrammar(withVoid).figures.includes("passage"));
  assert.equal(detectBreaks(withVoid).kinds.void, 1);
});

test("grammar: alternation reads as duality", () => {
  const a = band(16, [[G, 0, 0]]), b = band(16, [[fy(G), 0, 8]]);
  const sa = segmentStrip(a.f, a.w, a.h, 16), sb = segmentStrip(b.f, b.w, b.h, 16);
  const g = toGrammar([sa[0]!, sb[0]!, sa[1]!, sb[1]!, sa[2]!, sb[2]!]);
  assert.equal(g.sequence, "ABABAB");
  assert.ok(g.figures.includes("duality"));
});

test("deconstruct runs end to end on a bordered towel-like image", () => {
  const w = 200, h = 160, data = new Uint8Array(w * h).fill(235);
  // Cloth on a grey backdrop, with a mirrored border band near the bottom.
  for (let y = 20; y < 140; y++) for (let x = 20; x < 180; x++) data[y * w + x] = 210;
  const b = band(16, [[G, 0, 0], [fx(G), 8, 0]], 160);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 160; x++) if (b.f[y * 160 + x]! > 0.5) data[(110 + y) * w + 20 + x] = 40;
  const d = deconstruct({ data, width: w, height: h });
  assert.ok(d.crop.coverage < 1);
  assert.ok(["frieze", "mixed", "field"].includes(d.kind));
  assert.ok(d.bands.length >= 1);
  assert.equal(d.bands[0]!.frieze.group, "p1m1");
});

function tiled(cell: number, draw: (f: Float64Array, w: number, x: number, y: number) => void, w = 96, h = 96) {
  const f = new Float64Array(w * h).fill(BG);
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) draw(f, w, x, y);
  return { f, w, h };
}

test("wallpaper: symmetric dots on a square lattice have 4-fold rotation and mirrors (p4m/p4g)", async () => {
  const { classifyWallpaperGroup } = await import("./deconstruct.ts");
  const { f, w, h } = tiled(16, (f, w, x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) f[(y + 8 + dy) * w + x + 8 + dx] = INK; });
  const rep = findRepeatUnit(f, w, h);
  assert.equal(rep.kind, "lattice");
  if (rep.kind !== "lattice") return;
  const r = classifyWallpaperGroup(f, w, h, rep);
  assert.equal(r.rotationOrder, 4, JSON.stringify(r.scores));
  assert.ok(r.mirrorOrGlide);
  assert.deepEqual(r.candidates, ["p4m", "p4g"]);
});

// Lopsided glyph with no mirror, diagonal or rotational symmetry.
const L = ["##......", "#.......", "#..###..", "#....#..", ".....#..", "...###..", "........", "........"];

test("wallpaper: an asymmetric glyph on a lattice has no rotation or mirror (p1)", async () => {
  const { classifyWallpaperGroup } = await import("./deconstruct.ts");
  const { f, w, h } = tiled(16, (f, w, x, y) => { for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) if (L[yy]![xx] === "#") f[(y + 4 + yy) * w + x + 4 + xx] = INK; });
  const rep = findRepeatUnit(f, w, h);
  assert.equal(rep.kind, "lattice");
  if (rep.kind !== "lattice") return;
  const r = classifyWallpaperGroup(f, w, h, rep);
  assert.equal(r.rotationOrder, 1, JSON.stringify(r.scores));
  assert.equal(r.mirrorOrGlide, false, JSON.stringify(r.scores));
  assert.deepEqual(r.candidates, ["p1"]);
});

test("rosette: a 12-ray sun is dihedral D12; a 4-arm pinwheel spiral is cyclic C4", async () => {
  const { classifyRosette } = await import("./deconstruct.ts");
  const w = 96, h = 96, c = 47.5;
  const sun = new Float64Array(w * h), pin = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = Math.atan2(y - c, x - c), r = Math.hypot(x - c, y - c), inside = r < 44;
    sun[y * w + x] = inside && Math.cos(12 * t) > 0 ? INK : BG;
    pin[y * w + x] = inside && Math.sin(4 * t + r / 7) > 0 ? INK : BG;
  }
  const a = classifyRosette(sun, w, h), b = classifyRosette(pin, w, h);
  assert.equal(a.group, "D12", JSON.stringify(a.scores));
  assert.equal(b.group, "C4", JSON.stringify(b.scores));
});
