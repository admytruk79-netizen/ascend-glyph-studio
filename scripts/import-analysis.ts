/**
 * Load the master corpus measurements and style profiles into Neon (research_corpus_analysis,
 * research_style_profile). Measurements only — images are never stored.
 * Env: DATABASE_URL, MASTER_IN (master.ndjson.gz), PROFILES_IN (style-profiles.json, optional).
 */
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const masterIn = process.env.MASTER_IN ?? "out/master.ndjson.gz";
const profilesIn = process.env.PROFILES_IN ?? "out/style-profiles.json";
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const COLS = ["id", "source_key", "tradition", "culture", "region", "date_label", "title", "source_url", "image_url", "split", "kind", "frieze_groups", "wallpaper_rotation", "rosette", "features", "deconstruction", "dhash", "analyzer_version", "analyzed_at"];
const s = (v: unknown) => (typeof v === "string" ? v : null);

function values(r: any): unknown[] {
  const d = r.deconstruction ?? null;
  return [
    r.id, r.source, s(r.tradition), s(r.culture), s(r.region), s(r.date), s(r.title), s(r.objectURL), s(r.image),
    ["train", "validation", "holdout"].includes(r.split) ? r.split : null, s(d?.kind),
    (d?.bands ?? []).map((b: any) => b?.frieze?.group).filter((g: unknown) => typeof g === "string"),
    typeof d?.wallpaper?.rotationOrder === "number" ? d.wallpaper.rotationOrder : null, s(d?.rosette?.group),
    JSON.stringify(r.features ?? {}), d ? JSON.stringify(d) : null, s(r.dhash), s(r.analyzerVersion), s(r.analyzedAt),
  ];
}

async function writeBatch(rows: any[]) {
  if (!rows.length) return;
  const params: unknown[] = [];
  const tuples = rows.map((r) => {
    const v = values(r);
    const base = params.length;
    params.push(...v);
    return "(" + v.map((_, i) => `$${base + i + 1}`).join(",") + ")";
  });
  const set = COLS.slice(1).map((c) => `${c}=excluded.${c}`).join(",");
  await pool.query(`insert into research_corpus_analysis(${COLS.join(",")}) values ${tuples.join(",")} on conflict(id) do update set ${set}, imported_at=now()`, params);
}

async function main() {
  let n = 0, batch: any[] = [];
  const stream = createReadStream(masterIn);
  for await (const line of createInterface({ input: masterIn.endsWith(".gz") ? stream.pipe(createGunzip()) : stream, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= 500) { await writeBatch(batch); n += batch.length; batch = []; }
  }
  await writeBatch(batch); n += batch.length;
  let profiles = 0;
  if (existsSync(profilesIn)) {
    const p = JSON.parse(readFileSync(profilesIn, "utf8"));
    for (const prof of p.profiles ?? []) {
      await pool.query("insert into research_style_profile(tradition,built_at,n,profile) values($1,$2,$3,$4::jsonb) on conflict do nothing", [prof.tradition, p.builtAt, prof.n, JSON.stringify(prof)]);
      profiles++;
    }
  }
  const t = await pool.query("select count(*)::int n, count(distinct tradition)::int traditions from research_corpus_analysis");
  console.log("NEON " + JSON.stringify({ imported: n, profiles, table: t.rows[0] }));
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exitCode = 1; });
