/**
 * Merge a run's analyzed instances into the master corpus, assign stable
 * splits and write coverage stats.
 *
 * Env: MASTER_IN (optional, .ndjson or .ndjson.gz), ANALYZED_IN, MASTER_OUT
 * (.ndjson.gz), MASTER_STATS_OUT.
 */
import { createReadStream, createWriteStream, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import { assignSplit, corpusStats, mergeCorpus, type AnalyzedRow } from "./corpus/store.ts";

const masterIn = process.env.MASTER_IN ?? "";
const analyzedIn = process.env.ANALYZED_IN ?? "data/research/analyzed.ndjson";
const masterOut = process.env.MASTER_OUT ?? "data/research/master.ndjson.gz";
const statsOut = process.env.MASTER_STATS_OUT ?? "data/research/master-stats.json";

async function read(path: string): Promise<AnalyzedRow[]> {
  if (!path || !existsSync(path)) return [];
  const input = path.endsWith(".gz") ? createReadStream(path).pipe(createGunzip()) : createReadStream(path);
  const rows: AnalyzedRow[] = [];
  for await (const line of createInterface({ input, crlfDelay: Infinity })) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

async function main() {
  const master = await read(masterIn), incoming = await read(analyzedIn);
  const merged = mergeCorpus(master, incoming);
  for (const r of merged.rows) r.split ??= assignSplit(r);
  const gz = createGzip(), out = createWriteStream(masterOut);
  gz.pipe(out);
  for (const r of merged.rows) gz.write(JSON.stringify(r) + "\n");
  gz.end();
  await new Promise((r) => out.on("finish", r));
  const stats = { ...corpusStats(merged.rows), run: { previous: master.length, incoming: incoming.length, added: merged.added, updated: merged.updated, duplicates: merged.duplicates } };
  writeFileSync(statsOut, JSON.stringify(stats, null, 2));
  console.log("MASTER " + JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
