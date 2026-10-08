/**
 * Solid field mode: dense, connected geometric embroidery as on Poltava and Podillia shirt sleeves and yokes, where the
 * corpus study found the cloth mostly covered (shirts: 44–71 % ink) by a few large connected forms (4–15), not by many
 * loose motifs.
 *
 * A diamond lattice covers the area: every cell is a solid rhomb holding an inner motif (eight-point star, cross,
 * seeded rhomb or ASCEND star) in a contrasting colour, cells alternate colours in a checker, and lattice lines in the
 * dark thread run along both diagonals so the whole field is one piece. Solid tooth borders («зубці») close it top and
 * bottom (and at the sides of a panel). Every part is a fill, a satin or a run; smaller fills lie on larger ones.
 * Fail closed: null when a size cannot be made stitchable.
 */
import { Kit, type Pt } from "./folk-rich.ts";
import type { Roles } from "./lego.ts";
import { stitchSafe } from "./stitch-safe.ts";

const P = (x: number, y: number): Pt => ({ x, y });
function rng(seed: string) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

export type FieldOptions = { seed: string; roles: Roles; cell?: number; borders?: "top-bottom" | "all" };
export type FieldPlan = { cell: number; inner: string[]; checker: [string, string]; teeth: number };

/** A row of solid triangles («зубці») along a line from (x0, y) to (x1, y), pointing `dir` (−1 up, 1 down). */
function teeth(k: Kit, x0: number, x1: number, y: number, size: number, dir: 1 | -1, colors: [string, string]) {
  const n = Math.max(2, Math.round((x1 - x0) / size)), w = (x1 - x0) / n;
  // neighbouring teeth overlap a little at the base, so they stitch as one row (corner-to-corner would read as a gap)
  for (let i = 0; i < n; i++) k.fill("tooth", colors[i % 2]!, [P(x0 + i * w - (i ? 0.35 : 0), y), P(x0 + (i + 1) * w + (i < n - 1 ? 0.35 : 0), y), P(x0 + (i + 0.5) * w, y + dir * size * 0.8)], 90);
}

/** The same, vertical: along x from y0 to y1, pointing `dir` (−1 left, 1 right). */
function teethV(k: Kit, x: number, y0: number, y1: number, size: number, dir: 1 | -1, colors: [string, string]) {
  const n = Math.max(2, Math.round((y1 - y0) / size)), h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) k.fill("tooth", colors[i % 2]!, [P(x, y0 + i * h - (i ? 0.35 : 0)), P(x, y0 + (i + 1) * h + (i < n - 1 ? 0.35 : 0)), P(x + dir * size * 0.8, y0 + (i + 0.5) * h)], 0);
}

const INNER = ["star8", "cross", "seeded", "ascend"] as const;

function innerMotif(k: Kit, kind: (typeof INNER)[number], cx: number, cy: number, r: number, on: string, c: Roles) {
  if (kind === "star8") k.star8(cx, cy, r * 0.78, on, on, c.light);
  else if (kind === "cross") { const a = r * 0.55, w = Math.max(1.2, r * 0.22); k.satin("cross", on, [P(cx - a, cy), P(cx + a, cy)], w); k.satin("cross", on, [P(cx, cy - a), P(cx, cy + a)], w); }
  else if (kind === "seeded") { k.rhomb(on, cx, cy, r * 0.62, r * 0.62, "seeded"); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) k.rhomb(c.light, cx + dx! * r * 0.3, cy + dy! * r * 0.3, Math.max(1, r * 0.13), Math.max(1, r * 0.13), "seed"); }
  else k.ascendStar(cx, cy, r * 0.42, on, c.light, Math.PI / 4);
}

/** Fill a rectangle with the lattice. Returns the plan used. */
function lattice(k: Kit, x0: number, y0: number, w: number, h: number, o: FieldOptions, cell: number): FieldPlan {
  const r = rng(o.seed), c = o.roles;
  const checker: [string, string] = r() < 0.5 ? [c.main, c.dark] : [c.dark, c.main];
  const inner = [INNER[Math.floor(r() * INNER.length)]!, INNER[Math.floor(r() * INNER.length)]!];
  const cols = Math.max(1, Math.round(w / cell)), rows = Math.max(1, Math.round(h / cell)), cw = w / cols, ch = h / rows;
  // cells: rhombs centred on a grid and on the grid offset by half a cell (a diamond lattice)
  for (let j = 0; j <= rows * 2; j++) for (let i = 0; i <= cols * 2; i++) {
    if ((i + j) % 2) continue;
    const cx = x0 + (i / 2) * cw, cy = y0 + (j / 2) * ch;
    if (cx < x0 + cw * 0.45 || cx > x0 + w - cw * 0.45 || cy < y0 + ch * 0.45 || cy > y0 + h - ch * 0.45) continue;
    const odd = (i / 2 + j / 2) % 2 ? 1 : 0, rx = cw * 0.4, ry = ch * 0.4;
    k.rhomb(checker[odd]!, cx, cy, rx, ry, "cell");
    innerMotif(k, inner[odd]!, cx, cy, Math.min(rx, ry), odd ? c.light : c.accent, c);
  }
  // lattice lines along both diagonals in the channels between cells (they cross the top edge half a cell off the
  // cell centres), tying the field into one piece
  const lw = Math.max(1, Math.min(cw, ch) * 0.07);
  const clip = (p: Pt, q: Pt): Pt[] | null => {
    // keep the part of segment p→q inside the field's x range
    const lo = Math.min(p.x, q.x), hi = Math.max(p.x, q.x), a = Math.max(lo, x0), b = Math.min(hi, x0 + w);
    if (b - a < 1e-6) return null;
    const at = (x: number) => P(x, p.y + ((q.y - p.y) * (x - p.x)) / (q.x - p.x));
    return p.x < q.x ? [at(a), at(b)] : [at(b), at(a)];
  };
  for (let d = -rows - 1; d <= cols + rows + 1; d++) {
    const xs = x0 + (d + 0.5) * cw;
    for (const seg of [clip(P(xs, y0), P(xs + rows * cw, y0 + h)), clip(P(xs, y0), P(xs - rows * cw, y0 + h))])
      if (seg && Math.hypot(seg[1]!.x - seg[0]!.x, seg[1]!.y - seg[0]!.y) > 3) k.satin("lattice", c.leaf, seg, lw);
  }
  return { cell, inner: [...inner], checker, teeth: 0 };
}

/** A panel (yoke, sleeve «полик», diary cover): the lattice framed by tooth borders on all four sides. */
export function fieldPanel(width: number, height: number, o: FieldOptions): { kit: Kit; plan: FieldPlan } | null {
  const k = new Kit("fld-"), c = o.roles, t = Math.min(6, Math.min(width, height) * 0.05), m = 2;
  const pair: [string, string] = [c.main, c.dark];
  // frame: a solid strip with teeth pointing inward
  for (const y of [m, height - m]) k.satin("strip", c.dark, [P(m, y), P(width - m, y)], 1.4);
  for (const x of [m, width - m]) k.satin("strip", c.dark, [P(x, m), P(x, height - m)], 1.4);
  teeth(k, m + 3, width - m - 3, m + 1.6, t, 1, pair); teeth(k, m + 3, width - m - 3, height - m - 1.6, t, -1, pair);
  if (o.borders !== "top-bottom") { teethV(k, m + 1.6, m + 4 + t * 1.2, height - m - 4 - t * 1.2, t, 1, pair); teethV(k, width - m - 1.6, m + 4 + t * 1.2, height - m - 4 - t * 1.2, t, -1, pair); }
  const pad = m + 1.6 + t * 0.8 + 2.2;
  const plan = lattice(k, pad, pad, width - 2 * pad, height - 2 * pad, o, o.cell ?? Math.max(12, Math.min(width, height) / 7));
  k.resolveGaps();
  return stitchSafe(k) ? { kit: k, plan: { ...plan, teeth: t } } : null;
}

/** A band (cuff, hem, collar): one or two rows of the lattice between tooth borders. */
export function fieldBand(length: number, height: number, o: FieldOptions): { kit: Kit; plan: FieldPlan } | null {
  const k = new Kit("fldb-"), c = o.roles, t = Math.min(5, height * 0.09), pair: [string, string] = [c.main, c.dark];
  for (const y of [1.5, height - 1.5]) k.satin("strip", c.dark, [P(0, y), P(length, y)], 1.4);
  teeth(k, 0, length, 3.1, t, 1, pair); teeth(k, 0, length, height - 3.1, t, -1, pair);
  const pad = 3.1 + t * 0.8 + 2.2;
  const plan = lattice(k, 0, pad, length, height - 2 * pad, o, o.cell ?? (height - 2 * pad) / (height > 50 ? 2 : 1));
  k.resolveGaps();
  return stitchSafe(k) ? { kit: k, plan: { ...plan, teeth: t } } : null;
}
