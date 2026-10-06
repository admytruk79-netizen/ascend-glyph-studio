/**
 * Master corpus: one growing, deduplicated set of analyzed instances across
 * harvest runs, with stable provenance-aware splits and v3 coverage stats.
 */
import { NearDuplicateIndex } from "./features.ts";

export type AnalyzedRow = {
  id: string;
  source: string;
  institution?: string;
  objectURL?: string;
  accession?: string;
  tradition?: string;
  image?: string;
  relevance?: string[];
  dhash?: string;
  features?: Record<string, unknown>;
  deconstruction?: { kind?: string; bands?: { frieze?: { group?: string } }[]; wallpaper?: { rotationOrder?: number; candidates?: string[] } } | null;
  analyzerVersion?: string;
  analyzedAt?: string;
  split?: Split;
  [k: string]: unknown;
};
export type Split = "train" | "validation" | "holdout";

const imageKey = (r: AnalyzedRow) => (r.image ? "img:" + r.image.replace(/[?#].*$/, "").toLowerCase() : undefined);

/**
 * Merge a run's analyzed rows into the master. Existing rows keep their place;
 * an incoming row with the same id replaces it when it adds a deconstruction or
 * comes from a newer analysis. New rows that duplicate an existing object by
 * image URL or near-identical picture are dropped.
 */
export function mergeCorpus(master: AnalyzedRow[], incoming: AnalyzedRow[]) {
  const byId = new Map<string, number>(), byImage = new Set<string>(), hashes = new NearDuplicateIndex(6);
  const rows = master.map((r) => ({ ...r }));
  rows.forEach((r, i) => {
    byId.set(r.id, i);
    const k = imageKey(r);
    if (k) byImage.add(k);
    if (r.dhash?.length === 32) hashes.findOrAdd(r.dhash);
  });
  let added = 0, updated = 0, duplicates = 0;
  for (const r of incoming) {
    const at = byId.get(r.id);
    if (at !== undefined) {
      const old = rows[at]!;
      const better = (r.deconstruction && !old.deconstruction) || (r.analyzedAt ?? "") > (old.analyzedAt ?? "");
      if (better) { rows[at] = { ...old, ...r, split: old.split }; updated++; }
      continue;
    }
    const k = imageKey(r);
    if ((k && byImage.has(k)) || (r.dhash?.length === 32 && hashes.findOrAdd(r.dhash))) { duplicates++; continue; }
    if (k) byImage.add(k);
    byId.set(r.id, rows.length);
    rows.push({ ...r });
    added++;
  }
  return { rows, added, updated, duplicates };
}

/** FNV-1a 32-bit hash. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * Group key for leakage-safe splits: objects from the same source and the same
 * accession series (e.g. "1916.123" and "1916.456" → "1916") stay together.
 */
export function splitGroup(r: AnalyzedRow): string {
  const acc = (r.accession ?? "").trim();
  const trimmed = acc.replace(/[.\-/:\s][^.\-/:\s]*$/, "");
  // A series must still carry a number (an acquisition year or lot); otherwise group by object.
  const series = acc && /\d/.test(trimmed) ? trimmed : acc || r.id;
  return `${r.source}:${series.toLowerCase()}`;
}

/** Stable split: 80% train, 10% validation, 10% holdout, by group. */
export function assignSplit(r: AnalyzedRow): Split {
  const b = fnv(splitGroup(r)) % 100;
  return b < 80 ? "train" : b < 90 ? "validation" : "holdout";
}

export const MILESTONES = [25_000, 100_000, 250_000, 500_000, 750_000];
const V3 = { maxTraditionShare: 0.02, maxSourceShare: 0.05, minTraditions: 300, minSourceGroups: 250 };

export function corpusStats(rows: AnalyzedRow[]) {
  const count = (key: (r: AnalyzedRow) => string | undefined) => {
    const m: Record<string, number> = {};
    for (const r of rows) { const k = key(r); if (k) m[k] = (m[k] ?? 0) + 1; }
    return m;
  };
  const top = (m: Record<string, number>, n: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n));
  const total = rows.length;
  const bySource = count((r) => r.source), byTradition = count((r) => r.tradition ?? "unattributed");
  const bySplit = count((r) => r.split), byKind = count((r) => r.deconstruction?.kind ?? "not-deconstructed");
  const relevance: Record<string, number> = {};
  for (const r of rows) for (const t of r.relevance ?? []) relevance[t] = (relevance[t] ?? 0) + 1;
  const frieze: Record<string, number> = {}, rotation: Record<string, number> = {}, wallpaper: Record<string, number> = {};
  for (const r of rows) {
    for (const b of r.deconstruction?.bands ?? []) if (b.frieze?.group) frieze[b.frieze.group] = (frieze[b.frieze.group] ?? 0) + 1;
    const wp = r.deconstruction?.wallpaper;
    if (wp?.rotationOrder) rotation[wp.rotationOrder] = (rotation[wp.rotationOrder] ?? 0) + 1;
    if (wp?.candidates?.length) { const k = wp.candidates.join("/"); wallpaper[k] = (wallpaper[k] ?? 0) + 1; }
  }
  const share = (m: Record<string, number>) => (total ? Math.max(0, ...Object.values(m)) / total : 0);
  const sourceGroups = new Set(rows.map(splitGroup)).size;
  const traditions = Object.keys(byTradition).filter((t) => t !== "unattributed").length;
  const next = MILESTONES.find((m) => total < m);
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    total,
    milestone: { reached: MILESTONES.filter((m) => total >= m), next: next ?? null, progressToNext: next ? r3(total / next) : 1 },
    bySplit, bySource, byKind, relevance,
    friezeGroups: frieze, wallpaperRotation: rotation, wallpaperCandidates: wallpaper,
    traditions, sourceGroups, topTraditions: top(byTradition, 30),
    diversity: {
      maxTraditionShare: r3(share(byTradition)), maxSourceShare: r3(share(bySource)),
      checks: {
        traditionShare: share(byTradition) <= V3.maxTraditionShare,
        sourceShare: share(bySource) <= V3.maxSourceShare,
        traditions: traditions >= V3.minTraditions,
        sourceGroups: sourceGroups >= V3.minSourceGroups,
      },
    },
  };
}
