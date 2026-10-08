/**
 * Summarise the day's generated designs (lego-bands.mts and field-pack.mts outputs under a directory) into Neon:
 * learned_model 'daily-designs-latest', so the studio and the next session can see what was made and how it scored.
 *
 *   DATABASE_URL=... npx tsx scripts/originals/publish-daily.mts <dir> <run-url>
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const [dir, runUrl = ""] = process.argv.slice(2);
if (!dir) { console.error("usage: publish-daily.mts <dir> [run-url]"); process.exit(1); }
const sets: Record<string, unknown> = {};
for (const name of readdirSync(dir)) {
  for (const f of ["bands.json", "pack.json"]) { const p = join(dir, name, f); if (existsSync(p)) sets[name] = JSON.parse(readFileSync(p, "utf8")); }
}
const body = { date: new Date().toISOString().slice(0, 10), builtAt: new Date().toISOString(), artifacts: runUrl, sets };
console.log(JSON.stringify(Object.fromEntries(Object.entries(sets).map(([k, v]: any) => [k, (v.bands ?? v).length]))));
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
await db.query(`insert into learned_model(id, built_at, body) values('daily-designs-latest', now(), $1::jsonb) on conflict (id) do update set built_at = now(), body = excluded.body`, [JSON.stringify(body)]);
await db.end();
console.log("NEON learned_model daily-designs-latest");
