/**
 * Provisional motif library (unit cell 0..1, y down). Each generator motif has no symmetry of its own
 * (no mirror, no half-turn — a bud or seed at one end breaks it), so that
 * the band's symmetry group, not the motif, creates the familiar figures — a mirrored "branch" becomes
 * the fir/chevron ("в ялинки"), a rhomb with a seed under p2mm becomes the seeded rhomb lattice.
 * These will be replaced by primitives traced from Oleksandr's drawings; the engine does not change.
 */
export interface Pt { x: number; y: number }
export type Poly = Pt[];

export interface Motif {
  id: string;
  /** ASCEND primitives it expresses (docs/BLEND-ENGINE.md). */
  primitives: string[];
  /** Semantics entries (data/semantics/motif-semantics.v1.json) whose meaning it carries. */
  semantics: string[];
  polys: Poly[];
}

const P = (...xy: number[]): Poly => { const o: Poly = []; for (let i = 0; i < xy.length; i += 2) o.push({ x: xy[i]!, y: xy[i + 1]! }); return o; };

/** Generator motifs: repeated by the symmetry group. */
export const UNIT_MOTIFS: Record<string, Motif> = {
  branch: { id: "branch", primitives: ["branch", "line", "seed"], semantics: ["ua.yalynky", "ua.tree-of-life"], polys: [P(0.12, 0.9, 0.48, 0.36, 0.64, 0.46, 0.34, 0.9), P(0.62, 0.06, 0.9, 0.06, 0.9, 0.24, 0.62, 0.24)] },
  hook: { id: "hook", primitives: ["orbit", "crossing"], semantics: ["ua.rams-horns"], polys: [P(0.1, 0.1, 0.9, 0.1, 0.9, 0.38, 0.4, 0.38, 0.4, 0.9, 0.1, 0.9)] },
  seedRhomb: { id: "seedRhomb", primitives: ["seed", "crossing"], semantics: ["ua.rhombus"], polys: [P(0.38, 0.08, 0.76, 0.34, 0.5, 0.74, 0.08, 0.5), P(0.68, 0.66, 0.92, 0.66, 0.92, 0.92, 0.68, 0.92)] },
  wave: { id: "wave", primitives: ["line", "seed"], semantics: ["ua.zigzag"], polys: [P(0.1, 0.3, 0.28, 0.16, 0.76, 0.72, 0.58, 0.86), P(0.66, 0.08, 0.92, 0.08, 0.92, 0.32, 0.66, 0.32)] },
};

function star8(): Poly {
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, r = i % 2 ? 0.24 : 0.46;
    pts.push({ x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) });
  }
  return pts;
}
function sun6(): Poly[] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (k * Math.PI) / 3, w = Math.PI / 9;
    return P(0.5 + 0.12 * Math.cos(a - w), 0.5 + 0.12 * Math.sin(a - w), 0.5 + 0.45 * Math.cos(a), 0.5 + 0.45 * Math.sin(a), 0.5 + 0.12 * Math.cos(a + w), 0.5 + 0.12 * Math.sin(a + w));
  });
}
function rhombRing(): Poly[] {
  // a rhomb outline as four bars (fills cannot have holes) with a centre seed — enclosure around a seed
  const o = [{ x: 0.5, y: 0.04 }, { x: 0.96, y: 0.5 }, { x: 0.5, y: 0.96 }, { x: 0.04, y: 0.5 }];
  const i = [{ x: 0.5, y: 0.2 }, { x: 0.8, y: 0.5 }, { x: 0.5, y: 0.8 }, { x: 0.2, y: 0.5 }];
  const bars = [0, 1, 2, 3].map((k) => [o[k]!, o[(k + 1) % 4]!, i[(k + 1) % 4]!, i[k]!]);
  return [...bars, P(0.5, 0.4, 0.6, 0.5, 0.5, 0.6, 0.4, 0.5)];
}

/** Event motifs: the single `B` in `AAAA | B | AAAA`, symmetric, full band height. */
export const EVENT_MOTIFS: Record<string, Motif> = {
  star8: { id: "star8", primitives: ["radial-emission", "crossing"], semantics: ["ua.eight-point-star", "ua.ruzha"], polys: [star8()] },
  sun6: { id: "sun6", primitives: ["seed", "radial-emission"], semantics: ["ua.sonechko"], polys: sun6() },
  rhombRing: { id: "rhombRing", primitives: ["orbit", "seed"], semantics: ["ua.vikontsia", "ua.sash-enclosure"], polys: rhombRing() },
};
