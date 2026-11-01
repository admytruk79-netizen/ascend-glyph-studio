/** Point symmetry of a counted motif, read with a tolerance so worn or imperfectly charted pieces still classify. */
import { flipH, flipV, rot90, transpose, type Grid } from "./grid.ts";

export const GROUPS = ["d4", "c4", "d2", "c2", "mirror-v", "mirror-h", "none"] as const;
export type Group = (typeof GROUPS)[number];

/** Share of stitched cells (in either grid) that agree. 1 for two empty grids. */
export function agreement(a: Grid, b: Grid): number {
  if (a.w !== b.w || a.h !== b.h) return 0;
  let n = 0, ok = 0;
  for (let i = 0; i < a.cells.length; i++) if (a.cells[i] || b.cells[i]) { n++; if (a.cells[i] === b.cells[i]) ok++; }
  return n ? ok / n : 1;
}

export function detectSymmetry(g: Grid, tolerance = 0.97): Group {
  const sq = g.w === g.h, ok = (t: Grid) => agreement(g, t) >= tolerance;
  const v = ok(flipH(g)), h = ok(flipV(g)), d = sq && ok(transpose(g)), r4 = sq && ok(rot90(g)), r2 = ok(flipH(flipV(g)));
  if (v && h && d) return "d4";
  if (r4) return "c4";
  if (v && h) return "d2";
  if (v) return "mirror-v";
  if (h) return "mirror-h";
  if (r2) return "c2";
  return "none";
}

type Op = (x: number, y: number) => [number, number];
export function groupOps(group: Group, w: number, h: number): Op[] {
  const id: Op = (x, y) => [x, y], fv: Op = (x, y) => [w - 1 - x, y], fh: Op = (x, y) => [x, h - 1 - y], r2: Op = (x, y) => [w - 1 - x, h - 1 - y];
  if ((group === "d4" || group === "c4") && w !== h) throw new Error("group-needs-square-grid");
  const r1: Op = (x, y) => [w - 1 - y, x], r3: Op = (x, y) => [y, h - 1 - x], tr: Op = (x, y) => [y, x], at: Op = (x, y) => [w - 1 - y, h - 1 - x];
  switch (group) {
    case "d4": return [id, r1, r2, r3, fv, fh, tr, at];
    case "c4": return [id, r1, r2, r3];
    case "d2": return [id, fv, fh, r2];
    case "c2": return [id, r2];
    case "mirror-v": return [id, fv];
    case "mirror-h": return [id, fh];
    case "none": return [id];
  }
}

/** Partition of cell indices into orbits under the group: setting one representative sets the whole orbit. */
export function orbits(group: Group, w: number, h: number): number[][] {
  const ops = groupOps(group, w, h), seen = new Uint8Array(w * h), out: number[][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (seen[y * w + x]) continue;
    const orbit = [...new Set(ops.map((op) => { const [a, b] = op(x, y); return b * w + a; }))];
    orbit.forEach((i) => (seen[i] = 1));
    out.push(orbit);
  }
  return out;
}
