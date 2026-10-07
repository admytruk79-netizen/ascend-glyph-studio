/**
 * Build tradition style profiles from the master corpus and print a compact summary.
 * Env: MASTER_IN (master.ndjson.gz), PROFILES_OUT (json).
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { buildProfiles } from "./corpus/profiles.ts";
import type { AnalyzedRow } from "./corpus/store.ts";

const input = process.env.MASTER_IN ?? "master/master.ndjson.gz";
const out = process.env.PROFILES_OUT ?? "out/style-profiles.json";
async function main() {
  const rows: AnalyzedRow[] = [];
  const stream = createReadStream(input);
  for await (const line of createInterface({ input: input.endsWith(".gz") ? stream.pipe(createGunzip()) : stream })) if (line.trim()) rows.push(JSON.parse(line));
  const profiles = buildProfiles(rows);
  writeFileSync(out, JSON.stringify({ builtAt: new Date().toISOString(), rows: rows.length, profiles }, null, 2));
  const top = (d: Record<string, number>, n = 3) => Object.entries(d).slice(0, n).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", ");
  console.log(`STYLE PROFILES from ${rows.length} rows`);
  for (const p of profiles)
    console.log(`${p.tradition.padEnd(42)} n=${String(p.n).padStart(6)} text-labelled=${Math.round(p.labelConfidence * 100)}% | kind: ${top(p.kind)} | frieze: ${top(p.frieze)} | void=${p.median.voidRatio ?? "-"} mirrorX=${p.median.mirrorX ?? "-"} periodRel=${p.band.periodRel ?? "-"}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
