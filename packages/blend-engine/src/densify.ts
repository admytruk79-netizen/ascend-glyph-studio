/**
 * Densify: fill the empty ground of a composition with small motifs, the way folk embroidery leaves almost no bare
 * cloth between its large forms. Works on any Kit.
 *
 * The design is drawn into an occupancy grid; a distance transform gives, for every free cell, the clearance to the
 * nearest ink. The largest clearing gets a micro-motif sized to fit it (with the stitch gap kept), the grid is
 * updated, and so on until no clearing is big enough. Motifs by room: a small eight-point star or a three-leaf sprig
 * in large clearings, a kalyna cluster or a four-point star in medium ones, a single seed in small ones.
 */
import { Kit, type Pt } from "./folk-rich.ts";
import type { DesignObject } from "../../stitch-engine/src/index.ts";

export type DensifyOptions = {
  width: number; height: number;
  colors: { main: string; dark: string; leaf: string; light: string; accent: string };
  margin?: number;   // keep this far from the design's edge (mm)
  clear?: number;    // gap kept between a new motif and existing ink (mm); the grid is 0.4 mm, so this is generous
  minRadius?: number; // smallest clearing worth filling (mm)
  cell?: number;     // grid resolution (mm)
  maxMotifs?: number;
  mirrorX?: number;   // place every motif twice, mirrored about this vertical line (symmetric designs)
  targetCover?: number; // stop once this share of the area is ink (a complexity target from the corpus)
};

const P = (x: number, y: number): Pt => ({ x, y });

function stamp(grid: Uint8Array, gw: number, gh: number, cell: number, o: DesignObject) {
  const mark = (x: number, y: number) => { const i = Math.floor(x / cell), j = Math.floor(y / cell); if (i >= 0 && j >= 0 && i < gw && j < gh) grid[j * gw + i] = 1; };
  if (o.kind === "fill") {
    const xs = o.polygon.map((p) => p.x), ys = o.polygon.map((p) => p.y);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += cell / 2) for (let x = Math.min(...xs); x <= Math.max(...xs); x += cell / 2) {
      let inside = false;
      for (let a = 0, b = o.polygon.length - 1; a < o.polygon.length; b = a++) { const p = o.polygon[a]!, q = o.polygon[b]!; if ((p.y > y) !== (q.y > y) && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) inside = !inside; }
      if (inside) mark(x, y);
    }
    for (let a = 0; a < o.polygon.length; a++) { const p = o.polygon[a]!, q = o.polygon[(a + 1) % o.polygon.length]!, n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / (cell / 2)) + 1; for (let t = 0; t <= n; t++) mark(p.x + ((q.x - p.x) * t) / n, p.y + ((q.y - p.y) * t) / n); }
  } else {
    const half = o.kind === "satin" ? o.width / 2 : 0.3;
    for (let a = 1; a < o.path.length; a++) {
      const p = o.path[a - 1]!, q = o.path[a]!, n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / (cell / 2)) + 1;
      for (let t = 0; t <= n; t++) { const x = p.x + ((q.x - p.x) * t) / n, y = p.y + ((q.y - p.y) * t) / n; for (let dy = -half; dy <= half; dy += cell / 2) for (let dx = -half; dx <= half; dx += cell / 2) if (dx * dx + dy * dy <= half * half + 1e-9) mark(x + dx, y + dy); }
    }
  }
}

/** Two-pass chamfer distance (in cells) from every cell to the nearest occupied cell. */
function distance(grid: Uint8Array, gw: number, gh: number): Float32Array {
  const d = new Float32Array(gw * gh), INF = 1e9, a = 1, b = Math.SQRT2;
  for (let i = 0; i < d.length; i++) d[i] = grid[i] ? 0 : INF;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x; let v = d[i]!;
    if (x > 0) v = Math.min(v, d[i - 1]! + a);
    if (y > 0) { v = Math.min(v, d[i - gw]! + a); if (x > 0) v = Math.min(v, d[i - gw - 1]! + b); if (x < gw - 1) v = Math.min(v, d[i - gw + 1]! + b); }
    d[i] = v;
  }
  for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) {
    const i = y * gw + x; let v = d[i]!;
    if (x < gw - 1) v = Math.min(v, d[i + 1]! + a);
    if (y < gh - 1) { v = Math.min(v, d[i + gw]! + a); if (x < gw - 1) v = Math.min(v, d[i + gw + 1]! + b); if (x > 0) v = Math.min(v, d[i + gw - 1]! + b); }
    d[i] = v;
  }
  return d;
}

/** Add micro-motifs to every clearing of `k` big enough to hold one. Returns how many were placed. */
export function densify(k: Kit, o: DensifyOptions): number {
  const cell = o.cell ?? 0.4, clear = o.clear ?? 1.4, margin = o.margin ?? 2.5, minR = o.minRadius ?? 2.1;
  const gw = Math.ceil(o.width / cell), gh = Math.ceil(o.height / cell);
  const grid = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = i * cell, y = j * cell; if (x < margin || y < margin || x > o.width - margin || y > o.height - margin) grid[j * gw + i] = 1; }
  for (const ob of k.objs) stamp(grid, gw, gh, cell, ob);
  const c = o.colors;
  let placed = 0;
  for (let guard = 0; guard < (o.maxMotifs ?? 400); guard++) {
    const d = distance(grid, gw, gh);
    let best = 0, bi = -1;
    for (let i = 0; i < d.length; i++) if (d[i]! > best) { best = d[i]!; bi = i; }
    const room = best * cell - clear; // radius available for the motif
    if (bi < 0 || room < minR) break;
    const x = (bi % gw) * cell + cell / 2, y = Math.floor(bi / gw) * cell + cell / 2;
    const R = Math.min(room, 6.5);
    // one motif per size class, so the fill reads as an order, not confetti
    const put = (px: number, py: number, f: 1 | -1) => {
      const before = k.objs.length;
      if (R >= 4.6) { for (const s of [-1, 0, 1]) k.leaf(s ? c.leaf : c.accent, P(px, py + R * 0.55), -Math.PI / 2 + s * 0.65 * f, R * 1.35, Math.max(1, R * 0.22), 0, 0.45, "sprig"); k.disc(c.main, px, py + R * 0.6, Math.max(1, R * 0.16), "sprig-seed"); }
      else if (R >= 3.2) { const r = Math.max(1, R * 0.32); for (const [dx, dy] of [[0, -1.05], [-0.95, 0.55], [0.95, 0.55]]) k.disc(c.main, px + dx * r, py + dy * r, r, "kalyna"); }
      else k.disc(R >= 2.6 ? c.accent : c.light, px, py, Math.max(1, R * 0.55), "seed");
      for (const ob of k.objs.slice(before)) stamp(grid, gw, gh, cell, ob);
    };
    put(x, y, 1);
    if (o.mirrorX !== undefined) {
      const mx = 2 * o.mirrorX - x, mi = Math.floor(mx / cell) + Math.floor(y / cell) * gw;
      // the twin goes in only if its place is still clear (it is, in a symmetric design)
      if (Math.abs(mx - x) > R * 2 + clear && mx > 0 && mx < o.width && distance(grid, gw, gh)[mi]! * cell - clear >= R * 0.9) put(mx, y, -1);
    }
    if (o.targetCover !== undefined) { let ink = 0; for (const v of grid) ink += v; if (ink / grid.length >= o.targetCover) break; }
    placed++;
  }
  return placed;
}
