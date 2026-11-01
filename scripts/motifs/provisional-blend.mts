/**
 * Provisional blends before a tradition has been reviewed.
 *   npx tsx scripts/motifs/provisional-blend.mts [--english 150] [--out out/motif-learner/blends.json]
 * Ukrainian is fitted on the reviewed records only. English is fitted on the top-ranked complete motifs of the samplers
 * review queue (data/motifs/samplers/review-queue.json, ordered by the learned reviewer preference), marked open in
 * memory only: nothing here is written back as training data, and the reviewed set is untouched. Once samplers are
 * reviewed, train on those instead (cli.ts train) and this script is no longer needed.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { blend, parentFit } from "../../packages/motif-learner/src/blend.ts";
import { generate } from "../../packages/motif-learner/src/generate.ts";
import { toChart } from "../../packages/motif-learner/src/grid.ts";
import { fit, select, type MotifRecord } from "../../packages/motif-learner/src/model.ts";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1]! : d; };
const N = +arg("english", "150"), out = arg("out", "out/motif-learner/blends.json");

const reviewed = readdirSync("data/motifs/reviewed").filter((f) => f.endsWith(".json")).flatMap((f) => {
  const j = JSON.parse(readFileSync(join("data/motifs/reviewed", f), "utf8"));
  return j.schema === "ascend.motif-records.v1" ? (j.records as MotifRecord[]) : [];
});
const queue = JSON.parse(readFileSync("data/motifs/samplers/review-queue.json", "utf8")).motifs as any[];
const english: MotifRecord[] = queue.filter((m) => m.complete !== false).slice(0, N).map((m) => ({
  id: m.id, name: m.title, tradition: "English", region: null, technique: "unverified-counted", sourceGroup: m.sourceGroup, chart: m.chart.split("/"),
  provenance: { kind: "museum-object", licence: m.licence, culturalAccess: "open", independentSource: true, url: m.url, note: "PROVISIONAL: top-ranked, not yet reviewed" },
}));
const { model } = fit([...reviewed, ...english]);
const U = select(model, "Ukrainian"), E = select(model, "English");
console.log(JSON.stringify({ ukrainian: { examples: U.examples, sources: U.sourceGroups }, english: { examples: E.examples, sources: E.sourceGroups, provisional: true } }));

const sets: { label: string; note: string; sub: typeof U; group: "d4" | "mirror-v" | "c4"; size: number }[] = [
  { label: "English samplers (provisional)", note: "pure English", sub: E, group: "mirror-v", size: 19 },
  { label: "Blend: Ukrainian 50 / English 50", note: "mix", sub: blend([{ sub: U, weight: 1 }, { sub: E, weight: 1 }]), group: "d4", size: 19 },
  { label: "Blend: shared ground", note: "only constructions both use", sub: blend([{ sub: U, weight: 1 }, { sub: E, weight: 1 }], { mode: "common" }), group: "d4", size: 19 },
  { label: "Ukrainian shape, English palette", note: "70/30, colour from English", sub: blend([{ sub: U, weight: 0.7 }, { sub: E, weight: 0.3 }], { colourFrom: "English" }), group: "d4", size: 19 },
  { label: "English shape, Ukrainian palette", note: "70/30, colour from Ukrainian", sub: blend([{ sub: E, weight: 0.7 }, { sub: U, weight: 0.3 }], { colourFrom: "Ukrainian" }), group: "mirror-v", size: 19 },
];
const result = sets.map((s, i) => {
  const g = generate(s.sub, model.dataset, { count: 8, seed: 41 + i * 100, size: s.size, group: s.group });
  return { label: s.label, note: s.note, model: s.sub.key, items: g.accepted.map((c) => {
    const [u, e] = parentFit(c.grid, [U, E]);
    return { chart: toChart(c.grid), group: c.group, near: Math.round(c.nearest.iou * 100), nearest: c.nearest.id, ukrainian: u!.aboveFloor, english: e!.aboveFloor };
  }), rejected: g.rejected.length };
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ provisional: true, englishExamples: E.examples, ukrainianExamples: U.examples, sets: result }, null, 1));
for (const r of result) console.log(r.label, "accepted", r.items.length, "rejected", r.rejected, "mean UA/EN fit", (r.items.reduce((a, b) => a + b.ukrainian, 0) / Math.max(1, r.items.length)).toFixed(2), (r.items.reduce((a, b) => a + b.english, 0) / Math.max(1, r.items.length)).toFixed(2));
