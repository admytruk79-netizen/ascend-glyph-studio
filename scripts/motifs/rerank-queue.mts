/**
 * Re-rank the review queue by what the reviewer keeps.
 *   npx tsx scripts/motifs/rerank-queue.mts <decisions-dir>
 * Saves a decisions snapshot (verdicts only, no reviewer ids) to data/motifs/reviewed/decisions.json, fits the
 * preference model (kept = 1; rejected and passed-over within the reviewed stretch = 0), reports its held-out AUC by
 * image group, and rewrites data/motifs/public/review-queue.json ordered by predicted keep probability.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auc, fitPreference, groupCv, prefFeatures, prefScore, PREF_FEATURES } from "../../packages/motif-learner/src/review-preference.ts";

const dir = process.argv[2];
const queuePath = "data/motifs/public/review-queue.json";
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
const motifs: any[] = queue.motifs;
const decisions: Record<string, { verdict: string; coloursWrong: boolean; at: string }> = {};
if (dir) for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8")), d = raw.data ?? raw;
  decisions[f.replace(/\.json$/, "")] = { verdict: d.verdict, coloursWrong: !!d.coloursWrong, at: d.at };
} else Object.assign(decisions, JSON.parse(readFileSync("data/motifs/reviewed/decisions.json", "utf8")).decisions);
mkdirSync("data/motifs/reviewed", { recursive: true });
writeFileSync("data/motifs/reviewed/decisions.json", JSON.stringify({ schema: "ascend.motif-review-decisions.v1", note: "verdicts from the Motif Review page; reviewer ids omitted", decisions }, null, 1) + "\n");

// the stretch the reviewer worked through: up to the furthest kept motif in the order they saw
const pos = new Map(motifs.map((m, i) => [m.id, i]));
const lastKeep = Math.max(...Object.entries(decisions).filter(([, d]) => d.verdict === "keep").map(([id]) => pos.get(id) ?? -1));
const train = motifs.filter((m, i) => decisions[m.id] || i <= lastKeep);
const x = train.map((m) => prefFeatures({ chart: m.chart.split("/"), title: m.title, read: m.read }));
const y = train.map((m) => (decisions[m.id]?.verdict === "keep" ? 1 : 0));
const groups = train.map((m) => m.image);
const cvAuc = groupCv(x, y, groups, 5);
const model = fitPreference(x, y);
const all = motifs.map((m) => prefScore(model, prefFeatures({ chart: m.chart.split("/"), title: m.title, read: m.read })));
const oldRankAuc = auc(train.map((m) => m.rank), y);
// completeness is the reviewer's stated criterion: a motif cut off at the edge of its photograph sinks
motifs.forEach((m, i) => (m.pref = +(all[i]! * (m.complete === false ? 0.35 : 1)).toFixed(4)));
motifs.sort((a, b) => b.pref - a.pref || a.id.localeCompare(b.id));
queue.summary.ordering = { by: "reviewer preference", positives: y.filter(Boolean).length, negatives: y.filter((v) => !v).length, heldOutAucByImage: +cvAuc.toFixed(3), previousRankAuc: +oldRankAuc.toFixed(3) };
writeFileSync(queuePath, JSON.stringify(queue) + "\n");
const weights = Object.fromEntries(PREF_FEATURES.map((k, j) => [k, +model.weights[j]!.toFixed(2)]).sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number)));
writeFileSync("data/motifs/reviewed/review-preference.json", JSON.stringify({ schema: "ascend.motif-review-preference.v1", ...queue.summary.ordering, model }, null, 1) + "\n");
console.log(JSON.stringify({ ...queue.summary.ordering, weights }, null, 1));
