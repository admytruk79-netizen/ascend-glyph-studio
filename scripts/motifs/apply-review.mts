/**
 * Review decisions → training records.
 *   npx tsx scripts/motifs/apply-review.mts <decisions-dir>
 * <decisions-dir> holds one JSON file per decision (an ArtifactData export of the Motif Review page's "decisions"
 * collection: { verdict: "keep" | "reject", coloursWrong }). Kept motifs are written to
 * data/motifs/reviewed/public-reviewed.v1.json with culturalAccess "open"; kept with wrong colours become
 * "structure-only", so the learner trains their shape but never their colours. Rejected and undecided stay out.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MotifRecord } from "../../packages/motif-learner/src/model.ts";

const dir = process.argv[2];
if (!dir) throw new Error("usage: apply-review.mts <decisions-dir>");
const files = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith(".json"));
const decisions = new Map(files.map((f) => [f.replace(/^.*\//, "").replace(/\.json$/, ""), JSON.parse(readFileSync(join(dir, f), "utf8"))]));
const records = (JSON.parse(readFileSync("data/motifs/public/public-motifs.unreviewed.json", "utf8")) as { records: (MotifRecord & { quality?: number })[] }).records;
const out: MotifRecord[] = [];
let shapeOnly = 0;
for (const r of records) {
  const d = decisions.get(r.id);
  const v = d?.verdict ?? d?.data?.verdict, cw = d?.coloursWrong ?? d?.data?.coloursWrong;
  if (v !== "keep") continue;
  const { quality: _q, ...rec } = r;
  if (cw) shapeOnly++;
  out.push({ ...rec, provenance: { ...rec.provenance, culturalAccess: cw ? "structure-only" : "open", note: `${rec.provenance.note ?? ""} Reviewed: kept${cw ? " (colours wrong: shape only)" : ""}.` } });
}
mkdirSync("data/motifs/reviewed", { recursive: true });
writeFileSync("data/motifs/reviewed/public-reviewed.v1.json", JSON.stringify({ schema: "ascend.motif-records.v1", records: out }, null, 1) + "\n");
console.log(JSON.stringify({ decisions: decisions.size, kept: out.length, shapeOnly, sourceGroups: new Set(out.map((r) => r.sourceGroup)).size }));
