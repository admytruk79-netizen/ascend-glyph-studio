import { type Pt, dist, inset, polylineLength, resample, rotate, sampleAt } from "./geometry.js";

/** One needle penetration. `tie` marks lock stitches and `turn` the row-to-row step of a fill; the gate allows both to be short. */
export interface Stitch { x: number; y: number; tie?: boolean; turn?: boolean }

/** Running stitch along a path. Curves should use 1.5–2 mm, straights 2.5–3 mm. */
export function runStitch(path: Pt[], length = 2.5): Stitch[] {
  return resample(path, length);
}

/** Triple run (bean): every segment sewn forward, back, forward, for a bold line. */
export function tripleRun(path: Pt[], length = 2.5): Stitch[] {
  const pts = resample(path, length);
  const out: Stitch[] = [{ ...pts[0]! }];
  for (let i = 1; i < pts.length; i++) out.push({ ...pts[i]! }, { ...pts[i - 1]! }, { ...pts[i]! });
  return out;
}

export interface SatinOptions {
  /** Distance between successive zigzag stitches on one rail (mm). 0.35–0.45 typical. */
  spacing?: number;
  /** Total extra width added to counter pull-in (mm). */
  pullComp?: number;
  /** Underlay: "auto" picks by width as in the production spec. */
  underlay?: "auto" | "none";
}

/**
 * Satin column along a centreline. `width` is the finished width in mm (a number, or a function of
 * arc length for tapered columns). Returns the underlay first, then the satin, starting at the path start.
 */
export function satinColumn(center: Pt[], width: number | ((s: number) => number), o: SatinOptions = {}): Stitch[] {
  const spacing = o.spacing ?? 0.4;
  const pull = o.pullComp ?? 0.2;
  const L = polylineLength(center);
  const w = typeof width === "number" ? () => width : width;
  const out: Stitch[] = [];
  const maxW = typeof width === "number" ? width : Math.max(...Array.from({ length: 21 }, (_, i) => w((L * i) / 20)));

  const n = Math.max(1, Math.round(L / spacing));
  const side = (i: number) => (i % 2 ? 1 : -1);

  // Underlay travels from the start to the end of the column; the satin then sews back over it to the start.
  if ((o.underlay ?? "auto") === "auto" && L > 0) {
    if (maxW < 2) {
      out.push(...resample(center, 2)); // centre run, out
    } else {
      // edge run up one rail and back the other (0.4 mm inside), then an open zigzag out to the end
      const edge = (sd: 1 | -1) => resample(center, 2).map((_, i, arr) => {
        const s = (L * i) / (arr.length - 1);
        const { p, t } = sampleAt(center, s);
        const h = Math.max(0.2, w(s) / 2 - 0.4);
        return { x: p.x - t.y * h * sd, y: p.y + t.x * h * sd };
      });
      out.push(...edge(1), ...edge(-1).reverse());
      const zig = Math.max(2, Math.ceil(L / 2));
      for (let i = 0; i <= zig; i++) {
        const s = (L * i) / zig;
        const { p, t } = sampleAt(center, s);
        // finish on the rail opposite the satin's first stitch so the entry stitch spans the column
        const sd = (zig - i) % 2 === 0 ? -side(n) : side(n);
        const h = Math.max(0.2, w(s) / 2 - 0.4) * sd;
        out.push({ x: p.x - t.y * h, y: p.y + t.x * h });
      }
    }
  }

  const satin: Stitch[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (L * i) / n;
    const { p, t } = sampleAt(center, s);
    const h = ((w(s) + pull) / 2) * side(i);
    satin.push({ x: p.x - t.y * h, y: p.y + t.x * h });
  }
  if (out.length) {
    satin.reverse();
    satin[0] = { ...satin[0]!, turn: true }; // entry stitch from the underlay lies inside the column
  }
  out.push(...satin);
  return out;
}

export interface FillOptions {
  /** Fill angle in degrees (0 = rows along x). Neighbouring areas should differ. */
  angle?: number;
  /** Row spacing (density), mm. 0.40–0.45 for linen. */
  rowSpacing?: number;
  /** Stitch length within a row, mm. 3–4 typical. */
  stitchLength?: number;
  /** Extension of each row end against pull-in, mm. */
  pullComp?: number;
  /** Underlay: edge run plus light perpendicular tatami. */
  underlay?: boolean;
}

interface Seg { row: number; y: number; x0: number; x1: number }

/**
 * Tatami fill of a simple polygon. Rows are split into regions that can be sewn back and forth
 * without leaving the shape; regions are returned as separate stitch runs (the planner joins them with
 * travel or trims).
 */
export function tatamiFill(poly: Pt[], o: FillOptions = {}): Stitch[][] {
  const ang = ((o.angle ?? 0) * Math.PI) / 180;
  const rs = o.rowSpacing ?? 0.42;
  const sl = o.stitchLength ?? 3.5;
  const pc = (o.pullComp ?? 0.2) / 2;
  const regions: Stitch[][] = [];

  // Underlay only where the shape is big enough to hold it; small fills (seeds, < 4 mm) get none.
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  const small = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 4;
  if ((o.underlay ?? true) && !small) {
    const edge = inset(poly, 0.5);
    if (edge.length >= 3) {
      // underlay needs no corner points; where a thin shape's inset folds back, drop points closer than 1.2 mm
      const run: Stitch[] = [];
      for (const p of resample([...edge, edge[0]!], 2.5, 181)) if (!run.length || dist(run[run.length - 1]!, p) >= 1.2) run.push(p);
      if (run.length >= 3) regions.push(run);
    };
    for (const r of rawFill(poly, ang + Math.PI / 2, 2.0, 4, 0, 1)) regions.push(r);
  }
  for (const r of rawFill(poly, ang, rs, sl, pc, 0)) regions.push(r);
  return regions;
}

function rawFill(poly: Pt[], ang: number, rs: number, sl: number, pc: number, insetMm: number): Stitch[][] {
  // work in a frame where rows are horizontal
  const P = poly.map((p) => rotate(p, -ang));
  let minY = Infinity, maxY = -Infinity;
  for (const p of P) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const segs: Seg[] = [];
  let row = 0;
  for (let y = minY + rs / 2; y < maxY; y += rs, row++) {
    const xs: number[] = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i]!, b = P[(i + 1) % P.length]!;
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = xs[k]! + insetMm - pc, x1 = xs[k + 1]! - insetMm + pc;
      if (x1 - x0 >= 1.0) segs.push({ row, y, x0, x1 });
    }
  }
  // group into regions: chain each segment to an overlapping unused segment in the next row
  const used = new Set<Seg>();
  const byRow = new Map<number, Seg[]>();
  for (const s of segs) (byRow.get(s.row) ?? byRow.set(s.row, []).get(s.row)!).push(s);
  const regions: Stitch[][] = [];
  for (const start of segs) {
    if (used.has(start)) continue;
    const chain: Seg[] = [];
    let cur: Seg | undefined = start;
    while (cur) {
      used.add(cur);
      chain.push(cur);
      const c: Seg = cur;
      cur = (byRow.get(c.row + 1) ?? []).find((s) => !used.has(s) && s.x0 < c.x1 && s.x1 > c.x0);
    }
    const out: Stitch[] = [];
    chain.forEach((s, i) => {
      const ltr = i % 2 === 0;
      const xs: number[] = [];
      // staggered penetrations (offset by a third of a stitch per row) so needle holes don't line up
      const off = ((s.row % 3) / 3) * sl;
      xs.push(s.x0);
      for (let x = Math.floor((s.x0 - off) / sl) * sl + off + sl; x < s.x1 - 1.0; x += sl) if (x - s.x0 >= 1.0) xs.push(x);
      xs.push(s.x1);
      // no stitch longer than the requested length: split any long gap evenly (first/last gaps can reach 1 mm + sl)
      for (let k = xs.length - 1; k > 0; k--) {
        const g = xs[k]! - xs[k - 1]!;
        if (g > sl + 1e-9) {
          const parts = Math.ceil(g / sl);
          xs.splice(k, 0, ...Array.from({ length: parts - 1 }, (_, q) => xs[k - 1]! + (g * (q + 1)) / parts));
        }
      }
      if (!ltr) xs.reverse();
      xs.forEach((x, k) => out.push({ ...rotate({ x, y: s.y }, ang), ...(k === 0 && i > 0 ? { turn: true } : {}) }));
    });
    regions.push(out);
  }
  return regions;
}

/** Lock (tie) stitches: three tiny stitches back and forth along the first direction. */
export function tieAt(p: Pt, toward: Pt, len = 0.7): Stitch[] {
  const d = dist(p, toward) || 1;
  const u = { x: ((toward.x - p.x) / d) * len, y: ((toward.y - p.y) / d) * len };
  return [
    { x: p.x, y: p.y, tie: true },
    { x: p.x + u.x, y: p.y + u.y, tie: true },
    { x: p.x, y: p.y, tie: true },
    { x: p.x + u.x, y: p.y + u.y, tie: true },
    { x: p.x, y: p.y, tie: true },
  ];
}
