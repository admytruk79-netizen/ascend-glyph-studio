/**
 * ASCEND vocabulary v1, abstracted from Oleksandr's 13 source drawings (6 Oct 2026). The drawings stay
 * private; these are simplified geometric abstractions of their recurring forms, not reproductions:
 * twin peaks under a disc, root-axis figure, eye-seed, orbit crescent, lotus, heart-star, sun on a
 * horizon. Generator motifs have no symmetry of their own (the band's group creates the figure).
 * Palette: k-means over all 13 drawings.
 */
import type { Motif, Poly, Pt } from "./motifs.js";

const P = (...xy: number[]): Poly => { const o: Poly = []; for (let i = 0; i < xy.length; i += 2) o.push({ x: xy[i]!, y: xy[i + 1]! }); return o; };
const circle = (cx: number, cy: number, r: number, n = 20): Poly => Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / n), y: cy + r * Math.sin((2 * Math.PI * i) / n) }));
const rot = (ps: Poly, ang: number, cx = 0.5, cy = 0.5): Poly => ps.map((p) => ({ x: cx + (p.x - cx) * Math.cos(ang) - (p.y - cy) * Math.sin(ang), y: cy + (p.x - cx) * Math.sin(ang) + (p.y - cy) * Math.cos(ang) }));
/** Crescent: outer arc of radius r around (cx,cy) from a0 to a1, inner arc offset by d, as one polygon. */
function crescent(cx: number, cy: number, r: number, d: number, a0 = -Math.PI * 0.85, a1 = Math.PI * 0.85, n = 18): Poly {
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; outer.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; inner.push({ x: cx + d + r * 0.78 * Math.cos(a), y: cy + r * 0.78 * Math.sin(a) }); }
  return [...outer, ...inner];
}

export const ASCEND_PALETTE = {
  night: "#13131e", indigo: "#0e0e4b", royal: "#3d4088", lavender: "#a393c5", lilac: "#dcd7eb",
  sand: "#b89569", peach: "#e0b18e", ember: "#cc662b", ash: "#75615e", linen: "#efe9dc",
};

export const ASCEND_UNITS: Record<string, Motif> = {
  // twin peaks (one taller) under a small disc — drawings 3, 5, 7, 13
  peak: { id: "peak", primitives: ["axis", "seed", "crossing"], semantics: ["ascend.ascent"], polys: [P(0.06, 0.92, 0.34, 0.22, 0.5, 0.52, 0.66, 0.38, 0.92, 0.92), circle(0.8, 0.14, 0.08)] },
  // a standing axis whose roots spread to one side — drawings 5, 9, 13
  rootAxis: { id: "rootAxis", primitives: ["axis", "branch", "seed"], semantics: ["ascend.grounding"], polys: [P(0.42, 0.08, 0.56, 0.08, 0.56, 0.6, 0.86, 0.9, 0.7, 0.92, 0.5, 0.7, 0.3, 0.92, 0.2, 0.86, 0.42, 0.62), circle(0.8, 0.2, 0.07)] },
  // seed inside a tilted almond opening — drawing 6
  eyeSeed: { id: "eyeSeed", primitives: ["seed", "orbit", "void"], semantics: ["ascend.witness"], polys: [rot(crescent(0.5, 0.5, 0.36, 0.14), 0.5), circle(0.6, 0.47, 0.09)] },
  // orbit crescent with a satellite seed — drawings 2, 4, 9
  orbit: { id: "orbit", primitives: ["orbit", "torus", "seed"], semantics: ["ascend.protection"], polys: [rot(crescent(0.46, 0.52, 0.34, 0.1, -Math.PI * 0.7, Math.PI * 0.7), -0.6), circle(0.84, 0.16, 0.07)] },
};

function lotus(): Poly[] {
  const petal = (ang: number, len: number, w: number): Poly => rot(P(0.5, 0.78, 0.5 - w, 0.78 - len * 0.55, 0.5, 0.78 - len, 0.5 + w, 0.78 - len * 0.55), ang, 0.5, 0.78);
  return [petal(0, 0.62, 0.11), petal(-0.62, 0.5, 0.09), petal(0.62, 0.5, 0.09), petal(-1.15, 0.36, 0.07), petal(1.15, 0.36, 0.07), P(0.3, 0.86, 0.7, 0.86, 0.64, 0.94, 0.36, 0.94)];
}
/** Heart (drawings 8, 12): two lobes meeting in a point, with a seed at its centre left open as void. */
function heart(): Poly[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * 2 * Math.PI;
    const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: 0.5 + x / 36, y: 0.46 - y / 36 });
  }
  return [pts];
}
function sunHorizon(): Poly[] {
  return [circle(0.5, 0.4, 0.3, 28), P(0.06, 0.8, 0.94, 0.8, 0.94, 0.86, 0.06, 0.86), P(0.2, 0.92, 0.8, 0.92, 0.8, 0.96, 0.2, 0.96)];
}

export const ASCEND_EVENTS: Record<string, Motif> = {
  lotus: { id: "lotus", primitives: ["seed", "radial-emission", "branch"], semantics: ["ascend.growth"], polys: lotus() },
  heartStar: { id: "heartStar", primitives: ["seed", "orbit"], semantics: ["ascend.heart"], polys: heart() },
  sunHorizon: { id: "sunHorizon", primitives: ["seed", "axis"], semantics: ["ascend.light"], polys: sunHorizon() },
};
