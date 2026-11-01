/**
 * Re-rank the review queue by what the reviewer keeps.
 *   npx tsx scripts/motifs/rerank-queue.mts                      re-rank the current queue from the saved review rounds
 *   npx tsx scripts/motifs/rerank-queue.mts --round <decisions-dir>
 *        first freeze a new review round: the decisions exported from the page's current decision store, each with the
 *        exact chart it was made on (taken from the current queue), plus the motifs passed over in the stretch reviewed
 *
 * Learning only ever uses frozen rounds (data/motifs/reviewed/review-round-*.json), never a match by id against a newer
 * queue: a re-read can give an old id a different shape. Each queue gets its own decision store on the review page.
 * MOTIF_DIR / MOTIF_STORE rank another tradition's queue (e.g. data/motifs/samplers, samplers-decisions-r1) by the same
 * learned preference until that tradition has review rounds of its own; the preference file is then left alone.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fitPreference, groupCv, prefFeatures, prefScore, PREF_FEATURES } from "../../packages/motif-learner/src/review-preference.ts";

const reviewed = "data/motifs/reviewed", other = !!process.env.MOTIF_DIR && process.env.MOTIF_DIR !== "data/motifs/public";
const queuePath = `${process.env.MOTIF_DIR ?? "data/motifs/public"}/review-queue.json`;
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
const motifs: any[] = queue.motifs;
const rounds = () => readdirSync(reviewed).filter((f) => /^review-round-\d+\.json$/.test(f)).sort();

const ri = process.argv.indexOf("--round");
if (ri > 0) {
  const dir = process.argv[ri + 1]!, n = rounds().length + 1, decisions: Record<string, any> = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) { const raw = JSON.parse(readFileSync(join(dir, f), "utf8")); decisions[f.replace(/\.json$/, "")] = raw.data ?? raw; }
  const pos = new Map(motifs.map((m, i) => [m.id, i]));
  const last = Math.max(-1, ...Object.entries(decisions).filter(([, d]) => d.verdict === "keep").map(([id]) => pos.get(id) ?? -1));
  const examples = motifs.filter((m, i) => decisions[m.id] || i <= last).map((m) => ({ id: m.id, image: m.image, chart: m.chart, title: m.title, read: m.read, verdict: decisions[m.id]?.verdict ?? null, coloursWrong: !!decisions[m.id]?.coloursWrong }));
  writeFileSync(join(reviewed, `review-round-${n}.json`), JSON.stringify({ schema: "ascend.motif-review-round.v1", round: n, decisionStore: queue.decisionStore ?? "decisions", examples }) + "\n");
  console.log(`froze round ${n}: ${examples.length} examples, ${examples.filter((e) => e.verdict === "keep").length} kept`);
}

const examples = rounds().flatMap((f) => JSON.parse(readFileSync(join(reviewed, f), "utf8")).examples as any[]);
const feat = (m: any) => prefFeatures({ chart: m.chart.split("/"), title: m.title, read: m.read });
const x = examples.map(feat), y = examples.map((e) => (e.verdict === "keep" ? 1 : 0)), groups = examples.map((e) => e.image);
const cvAuc = groupCv(x, y, groups, 5), model = fitPreference(x, y);
// completeness is the reviewer's stated criterion: a motif cut off at the edge of its photograph sinks
motifs.forEach((m) => (m.pref = +(prefScore(model, feat(m)) * (m.complete === false ? 0.35 : 1)).toFixed(4)));
motifs.sort((a, b) => b.pref - a.pref || a.id.localeCompare(b.id));
queue.decisionStore = process.env.MOTIF_STORE ?? `decisions-r${rounds().length + 1}`;
queue.summary.ordering = { by: "reviewer preference", rounds: rounds().length, positives: y.filter(Boolean).length, negatives: y.filter((v) => !v).length, heldOutAucByImage: +cvAuc.toFixed(3) };
writeFileSync(queuePath, JSON.stringify(queue) + "\n");
const weights = Object.fromEntries(PREF_FEATURES.map((k, j) => [k, +model.weights[j]!.toFixed(2)]).sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number)));
if (!other) writeFileSync(join(reviewed, "review-preference.json"), JSON.stringify({ schema: "ascend.motif-review-preference.v1", ...queue.summary.ordering, weights, model }, null, 1) + "\n");
console.log(JSON.stringify({ ...queue.summary.ordering, decisionStore: queue.decisionStore, weights }, null, 1));
