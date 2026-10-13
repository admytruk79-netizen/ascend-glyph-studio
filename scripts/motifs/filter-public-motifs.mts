/**
 * Balanced quality filter over the collected public-use records (data/motifs/public/public-motifs.unreviewed.json).
 * Rejects clear-cut noise (too small, scattered, thin lines, solid fills, fragments); ranks the rest by motif quality ×
 * read quality, with lack of symmetry lowering the rank. Writes data/motifs/public/review-queue.json for the review page.
 * Records stay culturalAccess "review" until a person keeps them.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseChart } from "../../packages/motif-learner/src/grid.ts";
import { motifQuality } from "../../packages/motif-learner/src/quality.ts";
import type { MotifRecord } from "../../packages/motif-learner/src/model.ts";

const dir = "data/motifs/public";
const records = (JSON.parse(readFileSync(`${dir}/public-motifs.unreviewed.json`, "utf8")) as { records: (MotifRecord & { quality?: number })[] }).records;
const objects = new Map((JSON.parse(readFileSync(`${dir}/candidates.json`, "utf8")).objects as any[]).map((o) => [o.id, o]));
const reasons: Record<string, number> = {};
const kept: any[] = [];
for (const r of records) {
  const q = motifQuality(parseChart(r.chart));
  q.reasons.forEach((k) => (reasons[k] = (reasons[k] ?? 0) + 1));
  if (!q.passes) continue;
  const image = r.id.replace(/-m\d+$/, ""), o = objects.get(image) ?? {};
  kept.push({ id: r.id, image, rank: +(q.score * (r.quality ?? 0.5)).toFixed(3), motif: q.score, read: r.quality ?? null, soft: q.soft, group: q.group,
    title: (o.title ?? r.name ?? "").slice(0, 140), url: o.pageUrl ?? r.provenance.url ?? "", source: o.source ?? image.split("-")[0], licence: r.provenance.licence,
    evidence: (o.evidence ?? "").slice(0, 160), flags: o.flags ?? [], sourceGroup: r.sourceGroup, chart: r.chart.join("/") });
}
kept.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
const images = new Set(kept.map((k) => k.image));
const summary = { records: records.length, passed: kept.length, images: images.size, sourceGroups: new Set(kept.map((k) => k.sourceGroup)).size, noSymmetry: kept.filter((k) => k.soft.includes("no-symmetry")).length, rejectedBy: reasons };
writeFileSync(`${dir}/review-queue.json`, JSON.stringify({ schema: "ascend.motif-review-queue.v1", summary, motifs: kept }) + "\n");
console.log(JSON.stringify(summary, null, 1));
