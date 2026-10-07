/**
 * Build the analysis queue for a run: new harvest candidates not yet in the
 * master corpus, then master rows analyzed by an older analyzer version
 * (e.g. before deconstruction existed) so they are upgraded over time.
 *
 * Env: CORPUS_IN (harvest candidates), MASTER_IN (optional .ndjson[.gz]),
 * QUEUE_OUT, ANALYZER_VERSION (defaults to the current analyzer version).
 */
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { DECONSTRUCTION_VERSION } from "./corpus/deconstruct.ts";

const corpusIn = process.env.CORPUS_IN ?? "data/research/corpus.ndjson";
const masterIn = process.env.MASTER_IN ?? "";
const queueOut = process.env.QUEUE_OUT ?? "data/research/analysis-queue.ndjson";
const current = process.env.ANALYZER_VERSION ?? `structural-features/0.1+${DECONSTRUCTION_VERSION}`;

async function* lines(path: string) {
  if (!path || !existsSync(path)) return;
  const input = path.endsWith(".gz") ? createReadStream(path).pipe(createGunzip()) : createReadStream(path);
  for await (const line of createInterface({ input, crlfDelay: Infinity })) if (line.trim()) yield line;
}

async function main() {
  const inMaster = new Set<string>(), stale: string[] = [];
  for await (const line of lines(masterIn)) {
    const r = JSON.parse(line) as { id: string; analyzerVersion?: string };
    inMaster.add(r.id);
    if (r.analyzerVersion !== current) stale.push(line);
  }
  const out = createWriteStream(queueOut);
  let fresh = 0, known = 0;
  for await (const line of lines(corpusIn)) {
    const r = JSON.parse(line) as { id: string };
    if (inMaster.has(r.id)) { known++; continue; }
    out.write(line + "\n"); fresh++;
  }
  for (const line of stale) out.write(line + "\n");
  await new Promise((r) => out.end(r));
  console.log("QUEUE " + JSON.stringify({ analyzerVersion: current, master: inMaster.size, newCandidates: fresh, alreadyInMaster: known, staleMasterRows: stale.length }));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
