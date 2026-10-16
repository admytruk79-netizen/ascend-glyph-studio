/**
 * A style with no tradition behind it: random local-construction statistics (a sparse Dirichlet draw over the 512
 * 3×3 stitch patterns, with plenty of bare ground) and a random 2–4 thread palette by ring. The generator then builds
 * motifs that follow that invented style under exact symmetry. Nothing is learned from any record, so there is
 * nothing to copy and the near-copy gate has no references. The same seed gives the same style.
 */
import { rng } from "./generate.ts";
import type { SubModel } from "./model.ts";

function gamma(r: () => number, a: number): number {
  const b = a < 1 ? a + 1 : a, d = b - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = r();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return a < 1 ? d * v * Math.pow(r(), 1 / a) : d * v;
  }
}

export function inventStyle(seed: number): SubModel {
  const r = rng(seed ^ 0x51ed270b);
  const counts = Array.from({ length: 512 }, () => gamma(r, 0.06) * 1000);
  counts[0] = 4000 + r() * 6000;
  const palette = [1, 2, 3, 4, 5].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 3));
  const layers = [0, 1, 2, 3].map((l) => [0, 1, 2, 3, 4, 5].map((c) => { const i = palette.indexOf(c); return i < 0 ? 0 : i === l % palette.length ? 50 : 4; }));
  return {
    key: `invented-${seed}`, examples: 0, sourceGroups: 0, independentSources: 0,
    patch: { alpha: 0.01, counts, total: counts.reduce((a, b) => a + b, 0) },
    colour: { layers, sameAdjacent: 60 + r() * 30, adjacent: 100 },
    symmetry: { d4: 1, c4: 1, d2: 1, c2: 0, "mirror-v": 1, "mirror-h": 0, none: 0 },
    sizes: [21], density: { mean: 0.22 + r() * 0.3, sd: 0.05 }, islands: { mean: 1 + r() * 5 },
    plausibilityFloor: -Infinity, references: [],
  };
}
