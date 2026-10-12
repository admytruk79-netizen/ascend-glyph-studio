/**
 * Learned counted-motif model. Fitting estimates, per tradition (and per region once a region has enough examples):
 *  - a 3×3 local construction model: how stitched and bare cells sit together (the overlapping-pattern statistics
 *    behind Wave Function Collapse, kept as smoothed probabilities instead of hard allow/deny rules);
 *  - a colour model: thread choice by ring layer from the centre, and how often touching stitches share a thread;
 *  - global structure: symmetry group mix, motif size, stitch density and how many separate islands a motif has.
 *
 * Traditions are never pooled at inference: a request names its tradition, and an absent one is an error.
 * Admission fails closed: an unknown licence or a cultural-access status other than open/structure-only is excluded.
 */
import { createHash } from "node:crypto";
import { at, components, density, dihedral, parseChart, THREADS, type Grid } from "./grid.ts";
import { detectSymmetry, GROUPS, type Group } from "./symmetry.ts";

export const OPEN_LICENCES = ["public-domain", "CC0", "CC-BY", "CC-BY-SA", "repository-authored", "owner-licensed"] as const;

export interface MotifRecord {
  id: string;
  name?: string;
  tradition: string;
  /** Documented ethnographic region of the object, never a museum's location. null when not documented. */
  region: string | null;
  technique: string;
  /** Records sharing an object, book, chart author or artist share a group: splits never separate them. */
  sourceGroup: string;
  chart: string[];
  provenance: {
    kind: "museum-object" | "pattern-book" | "owner-drawing" | "repository-authored-generic-form";
    licence: string;
    culturalAccess: "open" | "structure-only" | "review" | "restricted";
    independentSource: boolean;
    url?: string;
    note?: string;
  };
}

export interface Admitted { record: MotifRecord; grid: Grid; colour: boolean }
export function admit(records: MotifRecord[]): { admitted: Admitted[]; excluded: { id: string; reason: string }[] } {
  const admitted: Admitted[] = [], excluded: { id: string; reason: string }[] = [];
  for (const r of records) {
    if (!(OPEN_LICENCES as readonly string[]).includes(r.provenance?.licence)) { excluded.push({ id: r.id, reason: `licence:${r.provenance?.licence ?? "missing"}` }); continue; }
    const access = r.provenance.culturalAccess;
    if (access !== "open" && access !== "structure-only") { excluded.push({ id: r.id, reason: `cultural-access:${access ?? "missing"}` }); continue; }
    if (!r.tradition || !r.sourceGroup) { excluded.push({ id: r.id, reason: "missing-tradition-or-group" }); continue; }
    let grid: Grid;
    try { grid = parseChart(r.chart); } catch (e) { excluded.push({ id: r.id, reason: (e as Error).message }); continue; }
    admitted.push({ record: r, grid, colour: access === "open" });
  }
  return { admitted, excluded };
}

const PATCHES = 512, LAYERS = 4, COLOURS = THREADS.length;

export interface SubModel {
  key: string;
  examples: number;
  sourceGroups: number;
  independentSources: number;
  patch: { alpha: number; counts: number[]; total: number };
  /** layers[l][c]: stitches of thread c in ring layer l (0 centre … 3 edge). null when only structure was admitted. */
  colour: { layers: number[][]; sameAdjacent: number; adjacent: number } | null;
  symmetry: Record<Group, number>;
  sizes: number[];
  density: { mean: number; sd: number };
  islands: { mean: number };
  plausibilityFloor: number;
  references: { id: string; chart: string[] }[];
}
export interface Model { schema: "ascend.motif-learner.v1"; dataset: string; augment: boolean; traditions: Record<string, SubModel>; regions: Record<string, SubModel> }

/** 3×3 neighbourhood code of stitched/bare cells centred on (x, y). Cells outside the grid are bare ground. */
export const patchCode = (g: Grid, x: number, y: number) => {
  let b = 0, k = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++, k++) if (at(g, x + dx, y + dy)) b |= 1 << k;
  return b;
};
/** Every window centre whose 3×3 touches the motif, including the bare ring around it. */
export function* windows(g: Grid): Generator<[number, number]> { for (let y = -1; y <= g.h; y++) for (let x = -1; x <= g.w; x++) yield [x, y]; }

export const layerOf = (g: Grid, x: number, y: number) => {
  const cx = (g.w - 1) / 2, cy = (g.h - 1) / 2, half = Math.max(cx, cy, 0.5);
  return Math.min(LAYERS - 1, Math.floor((LAYERS * Math.max(Math.abs(x - cx), Math.abs(y - cy))) / (half + 0.5)));
};

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);

function fitSub(key: string, items: Admitted[], augment: boolean, alpha: number): SubModel {
  const counts = new Array(PATCHES).fill(0);
  let total = 0;
  for (const { grid } of items) for (const g of augment ? dihedral(grid) : [grid]) for (const [x, y] of windows(g)) { counts[patchCode(g, x, y)]++; total++; }
  const coloured = items.filter((i) => i.colour);
  let colour: SubModel["colour"] = null;
  if (coloured.length) {
    const layers = Array.from({ length: LAYERS }, () => new Array(COLOURS).fill(0));
    let same = 0, adj = 0;
    for (const { grid: g } of coloured) for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = at(g, x, y); if (!c) continue;
      layers[layerOf(g, x, y)]![c]++;
      for (const [nx, ny] of [[x + 1, y], [x, y + 1]] as const) { const n = at(g, nx, ny); if (n) { adj++; if (n === c) same++; } }
    }
    colour = { layers, sameAdjacent: same, adjacent: adj };
  }
  const symmetry = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
  items.forEach((i) => symmetry[detectSymmetry(i.grid)]++);
  const dens = items.map((i) => density(i.grid)), m = mean(dens);
  const sub: SubModel = {
    key, examples: items.length,
    sourceGroups: new Set(items.map((i) => i.record.sourceGroup)).size,
    independentSources: new Set(items.filter((i) => i.record.provenance.independentSource).map((i) => i.record.sourceGroup)).size,
    patch: { alpha, counts, total }, colour, symmetry,
    sizes: items.map((i) => Math.max(i.grid.w, i.grid.h)),
    density: { mean: m, sd: Math.sqrt(mean(dens.map((d) => (d - m) ** 2))) },
    islands: { mean: mean(items.map((i) => components(i.grid))) },
    plausibilityFloor: -Infinity,
    references: items.map((i) => ({ id: i.record.id, chart: i.record.chart })),
  };
  const scores = items.map((i) => logLikelihood(i.grid, sub)).sort((a, b) => a - b);
  sub.plausibilityFloor = scores[Math.floor(scores.length * 0.1)]! - 0.25;
  return sub;
}

export interface FitOptions { augment?: boolean; alpha?: number; minRegionExamples?: number }
export function fit(records: MotifRecord[], opts: FitOptions = {}): { model: Model; excluded: { id: string; reason: string }[] } {
  const { augment = true, alpha = 0.5, minRegionExamples = 5 } = opts;
  const { admitted, excluded } = admit(records);
  const by = (k: (a: Admitted) => string | null) => {
    const m = new Map<string, Admitted[]>();
    for (const a of admitted) { const key = k(a); if (key) m.set(key, [...(m.get(key) ?? []), a]); }
    return m;
  };
  const traditions: Record<string, SubModel> = {}, regions: Record<string, SubModel> = {};
  for (const [k, items] of by((a) => a.record.tradition)) traditions[k] = fitSub(k, items, augment, alpha);
  for (const [k, items] of by((a) => (a.record.region ? `${a.record.tradition}/${a.record.region}` : null))) if (items.length >= minRegionExamples) regions[k] = fitSub(k, items, augment, alpha);
  const dataset = createHash("sha256").update(JSON.stringify(admitted.map((a) => [a.record.id, a.record.chart]).sort())).digest("hex").slice(0, 16);
  return { model: { schema: "ascend.motif-learner.v1", dataset, augment, traditions, regions }, excluded };
}

export const patchLogProb = (sub: SubModel, code: number) => Math.log((sub.patch.counts[code]! + sub.patch.alpha) / (sub.patch.total + PATCHES * sub.patch.alpha));

/** Mean log-probability per 3×3 window (nats). Higher means more like the tradition's local construction. */
export function logLikelihood(g: Grid, sub: SubModel): number {
  let s = 0, n = 0;
  for (const [x, y] of windows(g)) { s += patchLogProb(sub, patchCode(g, x, y)); n++; }
  return s / n;
}

/** Baseline: each cell stitched independently at the tradition's mean density. The learned model must beat this. */
export function baselineLogLikelihood(g: Grid, sub: SubModel): number {
  const p = Math.min(0.99, Math.max(0.01, sub.density.mean));
  let s = 0, n = 0;
  for (const [x, y] of windows(g)) { const b = patchCode(g, x, y); for (let k = 0; k < 9; k++) s += Math.log(b & (1 << k) ? p : 1 - p); n++; }
  return s / n;
}

/** The sub-model for a request: the documented region when it has its own fit, else the tradition. Never a pool. */
export function select(model: Model, tradition: string, region?: string | null): SubModel {
  const r = region ? model.regions[`${tradition}/${region}`] : undefined;
  const t = model.traditions[tradition];
  if (!r && !t) throw new Error(`tradition-not-trained:${tradition}`);
  return r ?? t!;
}
