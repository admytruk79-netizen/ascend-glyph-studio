/**
 * Learns what a reviewer keeps from their decisions on the Motif Review page, to order the queue they see next.
 * A small L2-regularised logistic regression over features of the read grid and its source title. Positives are kept
 * motifs; negatives are rejected motifs and the ones passed over in the stretch of the queue the reviewer worked
 * through (a weaker "not chosen" signal). Evaluation is by image group, so several motifs from one photograph never
 * sit on both sides of a split.
 */
import { parseChart, type Grid } from "./grid.ts";
import { motifQuality } from "./quality.ts";

export const PREF_FEATURES = ["logStitches", "logWidth", "thickness", "threads", "red", "black", "yellow", "green", "blue", "mirror", "density", "island", "read", "chart", "embroideryTitle", "objectTitle"] as const;
export type PrefFeature = (typeof PREF_FEATURES)[number];

export interface PrefInput { chart: string[]; title: string; read: number | null }

export function prefFeatures(m: PrefInput): number[] {
  const g: Grid = parseChart(m.chart), q = motifQuality(g);
  const counts = [0, 0, 0, 0, 0, 0];
  g.cells.forEach((c) => { if (c) counts[c] = (counts[c] ?? 0) + 1; });
  const share = (c: number) => counts[c]! / Math.max(1, q.stitches);
  const t = m.title.toLowerCase();
  const f: Record<PrefFeature, number> = {
    logStitches: Math.log1p(q.stitches) / 8, logWidth: Math.log1p(Math.max(g.w, g.h)) / 5, thickness: Math.min(1, q.thickness / 30), threads: q.threads / 5,
    red: share(1), black: share(2), blue: share(3), yellow: share(4), green: share(5),
    mirror: q.mirror, density: q.density, island: q.largestIsland, read: m.read ?? 0.5,
    chart: /\.svg$/.test(t) || /chart|схема|узор/.test(t) ? 1 : 0,
    embroideryTitle: /вишив|вишит|рушник|сорочк|embroider|vyshyv|rushnyk/.test(t) ? 1 : 0,
    objectTitle: /собор|church|street|вулиц|map|карт|дах|roof|building|будин/.test(t) ? 1 : 0,
  };
  return PREF_FEATURES.map((k) => f[k]);
}

export interface PrefModel { features: readonly string[]; weights: number[]; bias: number; mean: number[]; sd: number[] }

export function fitPreference(x: number[][], y: number[], o: { l2?: number; iterations?: number; rate?: number; positiveWeight?: number } = {}): PrefModel {
  const { l2 = 0.05, iterations = 2000, rate = 0.3 } = o, d = x[0]!.length, n = x.length;
  const mean = Array.from({ length: d }, (_, j) => x.reduce((s, r) => s + r[j]!, 0) / n);
  const sd = Array.from({ length: d }, (_, j) => Math.sqrt(x.reduce((s, r) => s + (r[j]! - mean[j]!) ** 2, 0) / n) || 1);
  const z = x.map((r) => r.map((v, j) => (v - mean[j]!) / sd[j]!));
  const pos = y.filter((v) => v === 1).length, pw = o.positiveWeight ?? (n - pos) / Math.max(1, pos); // balance classes
  const w = new Array(d).fill(0); let b = 0;
  for (let it = 0; it < iterations; it++) {
    const gw = new Array(d).fill(0); let gb = 0, tw = 0;
    for (let i = 0; i < n; i++) {
      const p = 1 / (1 + Math.exp(-(b + z[i]!.reduce((s, v, j) => s + v * w[j]!, 0)))), wt = y[i] ? pw : 1, e = (p - y[i]!) * wt;
      for (let j = 0; j < d; j++) gw[j] += e * z[i]![j]!;
      gb += e; tw += wt;
    }
    for (let j = 0; j < d; j++) w[j] -= rate * (gw[j] / tw + l2 * w[j]);
    b -= rate * (gb / tw);
  }
  return { features: PREF_FEATURES, weights: w, bias: b, mean, sd };
}

export const prefScore = (m: PrefModel, f: number[]) => 1 / (1 + Math.exp(-(m.bias + f.reduce((s, v, j) => s + ((v - m.mean[j]!) / m.sd[j]!) * m.weights[j]!, 0))));

/** Probability that a random positive outranks a random negative. */
export function auc(scores: number[], y: number[]): number {
  const p = scores.filter((_, i) => y[i]), q = scores.filter((_, i) => !y[i]);
  let w = 0; for (const a of p) for (const b of q) w += a > b ? 1 : a === b ? 0.5 : 0;
  return p.length && q.length ? w / (p.length * q.length) : NaN;
}

/** k-fold by group: each fold holds out whole groups (images). Returns the held-out AUC. */
export function groupCv(x: number[][], y: number[], groups: string[], k = 5): number {
  const ids = [...new Set(groups)].sort(), fold = new Map(ids.map((g, i) => [g, i % k]));
  const scores = new Array(x.length).fill(0);
  for (let f = 0; f < k; f++) {
    const tr = x.map((_, i) => i).filter((i) => fold.get(groups[i]!) !== f), te = x.map((_, i) => i).filter((i) => fold.get(groups[i]!) === f);
    if (!te.length || !tr.some((i) => y[i]) ) continue;
    const m = fitPreference(tr.map((i) => x[i]!), tr.map((i) => y[i]!));
    te.forEach((i) => (scores[i] = prefScore(m, x[i]!)));
  }
  return auc(scores, y);
}
