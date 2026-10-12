/**
 * New motifs from a learned model. Symmetry is exact by construction: the sampler sets whole orbits of cells, never
 * single cells. Shape and colour are then annealed against the learned energies (Metropolis, seeded, deterministic).
 * Every candidate passes two gates before it is returned:
 *  - near-copy: its shape must not overlap any training motif (under all 8 rotations/reflections) above a threshold;
 *  - plausibility: its local construction must score at least as well as the weaker training motifs.
 */
import { at, blank, components, density, dihedral, parseChart, type Grid } from "./grid.ts";
import { layerOf, logLikelihood, patchCode, patchLogProb, type SubModel } from "./model.ts";
import { orbits, GROUPS, type Group } from "./symmetry.ts";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, items: T[], weights: number[]) => {
  let u = r() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) if ((u -= weights[i]!) <= 0) return items[i]!;
  return items[items.length - 1]!;
};

export interface GenerateOptions {
  seed: number;
  size?: number;
  group?: Group;
  density?: number;
  iterations?: number;
  /** Thread used when the model holds structure only (no admitted colour). */
  structureThread?: number;
}

function anneal(n: number, steps: number, r: () => number, energy: { delta: (i: number) => number; apply: (i: number) => void }) {
  for (let s = 0; s < steps; s++) {
    const T = 2 * Math.pow(0.02, s / steps), i = Math.floor(r() * n), d = energy.delta(i);
    if (d <= 0 || r() < Math.exp(-d / T)) energy.apply(i);
  }
}

export function generateShape(sub: SubModel, o: GenerateOptions): { grid: Grid; group: Group } {
  const r = rng(o.seed);
  const groups = GROUPS.filter((g) => g !== "none");
  const group = o.group ?? pick(r, groups, groups.map((g) => sub.symmetry[g] + 0.25));
  let size = o.size ?? sub.sizes[Math.floor(r() * sub.sizes.length)]!;
  if (size % 2 === 0) size++;
  const target = o.density ?? Math.min(0.75, Math.max(0.15, sub.density.mean + (r() - 0.5) * sub.density.sd));
  const islands = Math.max(1, Math.round(sub.islands.mean));
  const g = blank(size, size), orb = orbits(group, size, size);
  orb.forEach((cells) => { const on = r() < target ? 1 : 0; cells.forEach((i) => (g.cells[i] = on)); });

  // windows whose 3×3 touches an orbit, as centre coordinates
  const touched = orb.map((cells) => {
    const s = new Set<number>();
    for (const i of cells) { const x = i % size, y = (i - x) / size; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s.add((y + dy + 1) * (size + 2) + (x + dx + 1)); }
    return [...s].map((k) => [(k % (size + 2)) - 1, Math.floor(k / (size + 2)) - 1] as const);
  });
  // Shape energy = W·KL(generated 3×3 histogram ‖ learned): rewards the tradition's whole mix of local constructions
  // (lines, diagonals, corners, voids, fills) instead of collapsing onto its single most common patch.
  const W = (size + 2) * (size + 2), hist = new Array(512).fill(0), lp = hist.map((_, b) => patchLogProb(sub, b));
  for (let y = -1; y <= size; y++) for (let x = -1; x <= size; x++) hist[patchCode(g, x, y)]++;
  const f = (n: number, b: number) => (n > 0 ? n * (Math.log(n / W) - lp[b]!) : 0);
  const N = size * size, wD = 10, wI = 8;
  let on = g.cells.filter(Boolean).length, isl = components(g);
  const global = (count: number, islandCount: number) => wD * N * (count / N - target) ** 2 + wI * Math.max(0, islandCount - islands) + (count === 0 ? 1e3 : 0);
  const flip = (k: number) => orb[k]!.forEach((i) => (g.cells[i] = g.cells[i] ? 0 : 1));
  const codes = (k: number) => touched[k]!.map(([x, y]) => patchCode(g, x, y));
  let pending = { islands: isl, from: [] as number[], to: [] as number[] };
  anneal(orb.length, o.iterations ?? 400 * orb.length, r, {
    delta: (k) => {
      const from = codes(k), before = global(on, isl);
      flip(k);
      const to = codes(k), nOn = on + orb[k]!.length * (g.cells[orb[k]![0]!] ? 1 : -1), nIsl = components(g);
      flip(k);
      const change = new Map<number, number>();
      from.forEach((b) => change.set(b, (change.get(b) ?? 0) - 1));
      to.forEach((b) => change.set(b, (change.get(b) ?? 0) + 1));
      let d = global(nOn, nIsl) - before;
      for (const [b, c] of change) if (c) d += f(hist[b]! + c, b) - f(hist[b]!, b);
      pending = { islands: nIsl, from, to };
      return d;
    },
    apply: (k) => {
      flip(k); on += orb[k]!.length * (g.cells[orb[k]![0]!] ? 1 : -1); isl = pending.islands;
      pending.from.forEach((b) => hist[b]--); pending.to.forEach((b) => hist[b]++);
    },
  });
  return { grid: g, group };
}

/** Thread for each stitched orbit, annealed against the learned layer mix and same-thread adjacency rate. */
export function colourShape(shape: Grid, group: Group, sub: SubModel, o: GenerateOptions): Grid {
  const g: Grid = { ...shape, cells: shape.cells.slice() };
  if (!sub.colour) { g.cells = g.cells.map((c) => (c ? o.structureThread ?? 1 : 0)); return g; }
  const r = rng(o.seed ^ 0x9e3779b9), { layers, sameAdjacent, adjacent } = sub.colour;
  const threads = layers.reduce((acc, row) => acc.map((v, c) => v + row[c]!), new Array(layers[0]!.length).fill(0)).map((v, c) => (c && v > 0 ? c : 0)).filter(Boolean);
  if (!threads.length) { g.cells = g.cells.map((c) => (c ? o.structureThread ?? 1 : 0)); return g; }
  const lp = (l: number, c: number) => { const row = layers[l]!, t = threads.reduce((s, k) => s + row[k]!, 0); return Math.log((row[c]! + 0.1) / (t + 0.1 * threads.length)); };
  const a = (sameAdjacent + 1) / (adjacent + 2), lSame = Math.log(a), lDiff = Math.log(1 - a);
  const orb = orbits(group, g.w, g.h).filter((cells) => g.cells[cells[0]!]);
  const cellE = (i: number) => {
    const x = i % g.w, y = (i - x) / g.w, c = g.cells[i]!;
    let e = -lp(layerOf(g, x, y), c);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) { const n = at(g, nx, ny); if (n) e -= n === c ? lSame : lDiff; }
    return e;
  };
  orb.forEach((cells) => { const c = threads[Math.floor(r() * threads.length)]!; cells.forEach((i) => (g.cells[i] = c)); });
  let proposal = 0;
  const energyOf = (k: number) => orb[k]!.reduce((s, i) => s + cellE(i), 0);
  anneal(orb.length, o.iterations ?? 200 * Math.max(1, orb.length), r, {
    delta: (k) => {
      const old = g.cells[orb[k]![0]!]!, before = energyOf(k);
      proposal = threads[Math.floor(r() * threads.length)]!;
      orb[k]!.forEach((i) => (g.cells[i] = proposal));
      const after = energyOf(k);
      orb[k]!.forEach((i) => (g.cells[i] = old));
      return after - before;
    },
    apply: (k) => orb[k]!.forEach((i) => (g.cells[i] = proposal)),
  });
  return g;
}

/** Highest shape IoU between a candidate and any reference, over all rotations/reflections, centres aligned. */
export function nearestReference(g: Grid, refs: { id: string; chart: string[] }[]): { id: string | null; iou: number } {
  let best = { id: null as string | null, iou: 0 };
  for (const ref of refs) for (const t of dihedral(parseChart(ref.chart))) {
    const W = Math.max(g.w, t.w), H = Math.max(g.h, t.h), ax = (W - g.w) >> 1, ay = (H - g.h) >> 1, bx = (W - t.w) >> 1, by = (H - t.h) >> 1;
    let inter = 0, union = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = at(g, x - ax, y - ay) > 0, q = at(t, x - bx, y - by) > 0; if (p && q) inter++; if (p || q) union++; }
    const iou = union ? inter / union : 0;
    if (iou > best.iou) best = { id: ref.id, iou };
  }
  return best;
}

export interface Candidate {
  grid: Grid;
  seed: number;
  group: Group;
  logLikelihood: number;
  nearest: { id: string | null; iou: number };
  density: number;
  lineage: { model: string; dataset: string; references: string[] };
}
export interface Rejection { seed: number; reason: "near-copy" | "implausible"; detail: number }

export function generate(sub: SubModel, dataset: string, opts: { count: number; seed: number; maxIoU?: number } & Omit<GenerateOptions, "seed">) {
  const { count, seed, maxIoU = 0.8, ...rest } = opts;
  const accepted: Candidate[] = [], rejected: Rejection[] = [];
  for (let k = 0; accepted.length < count && k < count * 6; k++) {
    const s = (seed + k * 7919) >>> 0, o = { ...rest, seed: s };
    const { grid: shape, group } = generateShape(sub, o);
    const grid = colourShape(shape, group, sub, o);
    const ll = logLikelihood(grid, sub), nearest = nearestReference(grid, sub.references);
    if (nearest.iou >= maxIoU) { rejected.push({ seed: s, reason: "near-copy", detail: nearest.iou }); continue; }
    if (ll < sub.plausibilityFloor) { rejected.push({ seed: s, reason: "implausible", detail: ll }); continue; }
    accepted.push({ grid, seed: s, group, logLikelihood: ll, nearest, density: density(grid), lineage: { model: sub.key, dataset, references: sub.references.map((r) => r.id) } });
  }
  return { accepted, rejected };
}
