/**
 * Merge a run's analyzed instances into the master corpus, assign stable
 * splits and write coverage stats.
 *
 * Env: MASTER_IN (optional, .ndjson or .ndjson.gz), ANALYZED_IN, MASTER_OUT
 * (.ndjson.gz), MASTER_STATS_OUT, CANDIDATES_IN (optional harvest candidates used to
 * backfill catalogue metadata — culture, region, date, title — on rows that lack it).
 */
import { createReadStream, createWriteStream, existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import { assignSplit, corpusStats, mergeCorpus, type AnalyzedRow } from "./corpus/store.ts";

const masterIn = process.env.MASTER_IN ?? "";
const analyzedIn = process.env.ANALYZED_IN ?? "data/research/analyzed.ndjson";
const masterOut = process.env.MASTER_OUT ?? "data/research/master.ndjson.gz";
const statsOut = process.env.MASTER_STATS_OUT ?? "data/research/master-stats.json";
const candidatesIn = process.env.CANDIDATES_IN ?? "";
const META = ["culture", "region", "date", "title"] as const;

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
  let backfilled = 0;
  if (candidatesIn) {
    const meta = new Map<string, Record<string, unknown>>();
    for (const c of await read(candidatesIn)) {
      const raw = (c as any).raw ?? {};
      meta.set(c.id, Object.fromEntries(META.map((k) => [k, (c as any)[k] ?? raw[k]])));
    }
    for (const r of merged.rows) {
      const m = meta.get(r.id);
      if (!m) continue;
      let hit = false;
      for (const k of META) if (r[k] === undefined && typeof m[k] === "string") { r[k] = m[k]; hit = true; }
      if (hit) backfilled++;
    }
  }
  const gz = createGzip(), out = createWriteStream(masterOut);
  gz.pipe(out);
  for (const r of merged.rows) gz.write(JSON.stringify(r) + "\n");
  gz.end();
  await new Promise((r) => out.on("finish", r));
  const stats = { ...corpusStats(merged.rows), run: { previous: master.length, incoming: incoming.length, added: merged.added, updated: merged.updated, duplicates: merged.duplicates, metadataBackfilled: backfilled } };
  writeFileSync(statsOut, JSON.stringify(stats, null, 2));
  console.log("MASTER " + JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
