/**
 * Build one repeat cell of a frieze from an asymmetric motif, for each of the 7 frieze groups
 * (IUC notation as used by the analyser): V = mirror x→1−x, H = mirror y→1−y, R = half-turn.
 */
import type { Poly, Pt } from "./motifs.js";

export type FriezeGroup = "p1" | "p11m" | "p1m1" | "p11g" | "p2" | "p2mg" | "p2mm";
export const FRIEZE_GROUPS: FriezeGroup[] = ["p1", "p11m", "p1m1", "p11g", "p2", "p2mg", "p2mm"];

const map = (ps: Poly[], f: (p: Pt) => Pt): Poly[] => ps.map((p) => p.map(f));
const V = (ps: Poly[]) => map(ps, (p) => ({ x: 1 - p.x, y: p.y }));
const H = (ps: Poly[]) => map(ps, (p) => ({ x: p.x, y: 1 - p.y }));
const R = (ps: Poly[]) => map(ps, (p) => ({ x: 1 - p.x, y: 1 - p.y }));
/** Place unit-cell content into the sub-box [x0,x0+w]×[y0,y0+h] of the cell. */
const into = (ps: Poly[], x0: number, y0: number, w: number, h: number) => map(ps, (p) => ({ x: x0 + p.x * w, y: y0 + p.y * h }));

/** Polygons of one cell (unit square; x along the band, y across it). */
export function friezeCell(m: Poly[], g: FriezeGroup): Poly[] {
  switch (g) {
    case "p1": return m;
    case "p1m1": return [...into(m, 0, 0, 0.5, 1), ...into(V(m), 0.5, 0, 0.5, 1)];
    case "p11m": return [...into(m, 0, 0, 1, 0.5), ...into(H(m), 0, 0.5, 1, 0.5)];
    case "p11g": return [...into(m, 0, 0, 0.5, 0.5), ...into(H(m), 0.5, 0.5, 0.5, 0.5)];
    case "p2": return [...into(m, 0, 0, 0.5, 1), ...into(R(m), 0.5, 0, 0.5, 1)];
    case "p2mm": {
      const q = (x: number, y: number, ps: Poly[]) => into(ps, x, y, 0.5, 0.5);
      return [...q(0, 0, m), ...q(0.5, 0, V(m)), ...q(0, 0.5, H(m)), ...q(0.5, 0.5, R(m))];
    }
    case "p2mg": {
      const q = (x: number, y: number, ps: Poly[]) => into(ps, x, y, 0.25, 0.5);
      return [...q(0, 0, m), ...q(0.25, 0, V(m)), ...q(0.5, 0.5, H(m)), ...q(0.75, 0.5, R(m))];
    }
  }
}
