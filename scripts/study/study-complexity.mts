/**
 * Study how complex real towels, shirts and skirts are, from the museum corpus in Neon.
 *
 *   DATABASE_URL=... npx tsx scripts/study/study-complexity.mts
 *
 * Every open-access object whose catalogue title names a towel (рушник), shirt (сорочка) or skirt (спідниця, плахта,
 * запаска) is fetched, its centre measured (scripts/study/complexity.ts), and the measures summed into profiles per
 * object type and per type and tradition. Writes learned_model 'complexity-profiles' and out/complexity.json.
 * Images are analysed in memory and never stored.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import pg from "pg";
import sharp from "sharp";
import { USER_AGENT } from "../corpus/sources.ts";
import { centre, complexityOf, objectTypeOf, profileOf, STUDY_PX, type Complexity } from "./complexity.ts";

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
db.on("error", () => {});
const { rows } = await db.query(`select o.id, o.image_url, o.title, coalesce(t.tradition, o.tradition) tradition, t.ornament_p
  from research_corpus_object o left join research_image_tag t on t.object_id = o.id
  where o.image_url is not null and coalesce(o.cultural_access, 'open') = 'open'`);
const items = rows.map((r: any) => ({ ...r, type: objectTypeOf(r.title ?? "") })).filter((r: any) => r.type && (r.ornament_p === null || Number(r.ornament_p) >= 0.6));
console.log(JSON.stringify({ candidates: items.length, byType: Object.fromEntries(["towel", "shirt", "skirt"].map((t) => [t, items.filter((r: any) => r.type === t).length])) }));

const lastHit = new Map<string, number>();
async function fetchImage(url: string): Promise<Buffer> {
  if (url.includes("iiif.archive.org/")) url = url.replace(/\/full\/(!?\d*,\d*|max|full)\/0\/default\.(jpg|png)$/, "/full/!512,512/0/default.$2");
  const host = new URL(url).host, wait = (lastHit.get(host) ?? 0) + 500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  const h: Record<string, string> = { "user-agent": USER_AGENT, accept: "image/jpeg,image/png,image/*;q=0.8" };
  if (url.includes("artic.edu")) h["AIC-User-Agent"] = USER_AGENT;
  const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(String(res.status));
  return Buffer.from(await res.arrayBuffer());
}

const measured: ({ id: string; type: string; tradition: string; title: string; closeup: boolean } & Complexity)[] = [];
let failed = 0;
const deadline = Date.now() + Number(process.env.STUDY_MAX_MINUTES ?? 45) * 60_000;
// a few hosts at a time: interleave by host so one slow museum does not hold the rest
for (const r of items as any[]) {
  if (Date.now() > deadline) break;
  try {
    const buf = await fetchImage(r.image_url);
    // the centre is measured at STUDY_PX after cropping, the same scale ASCEND designs are measured at
    const raw = await sharp(buf).rotate().resize(Math.round(STUDY_PX / 0.72), Math.round(STUDY_PX / 0.72), { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const c = complexityOf(centre({ data: raw.data, width: raw.info.width, height: raw.info.height }));
    // a close-up: ornament fills a good part of the centre (not a whole garment on a mannequin or a table)
    measured.push({ id: r.id, type: r.type, tradition: r.tradition ?? "Unlabelled", title: String(r.title).slice(0, 120), closeup: c.cover >= 0.35, ...c });
    if (measured.length % 50 === 0) console.log(JSON.stringify({ measured: measured.length, failed }));
  } catch (e) { if (++failed <= 5) console.log(JSON.stringify({ failed: r.id, error: String((e as Error).message).slice(0, 120) })); }
}

const group = (key: (m: (typeof measured)[number]) => string) => { const g = new Map<string, Complexity[]>(); for (const m of measured) { const k = key(m); (g.get(k) ?? g.set(k, []).get(k)!).push(m); } return g; };
const body = {
  version: "complexity/0.2-closeups", px: STUDY_PX, builtAt: new Date().toISOString(), measured: measured.length, failed,
  types: Object.fromEntries([...group((m) => m.type)].map(([k, v]) => [k, profileOf(v)])),
  // close-ups only: the profile to fit designs to (whole-garment photos lose fine detail at any resolution)
  closeups: Object.fromEntries([...group((m) => (m.closeup ? m.type : "-"))].filter(([k]) => k !== "-").map(([k, v]) => [k, profileOf(v)])),
  typeTradition: Object.fromEntries([...group((m) => `${m.type}|${m.tradition}`)].filter(([, v]) => v.length >= 8).map(([k, v]) => [k, profileOf(v)])),
  // the most and least complex pieces of each type, for review
  examples: Object.fromEntries(["towel", "shirt", "skirt"].map((t) => { const v = measured.filter((m) => m.type === t).sort((a, b) => b.elements - a.elements); return [t, { busiest: v.slice(0, 5).map((m) => ({ id: m.id, title: m.title, elements: m.elements, cover: m.cover })), plainest: v.slice(-3).map((m) => ({ id: m.id, title: m.title, elements: m.elements, cover: m.cover })) }]; })),
};
mkdirSync("out", { recursive: true });
writeFileSync("out/complexity.json", JSON.stringify({ ...body, items: measured }, null, 1));
if (measured.length >= 30) {
  await db.query(`insert into learned_model(id, built_at, body) values('complexity-profiles', now(), $1::jsonb) on conflict (id) do update set built_at = now(), body = excluded.body`, [JSON.stringify(body)]);
  console.log("NEON learned_model complexity-profiles");
} else { console.error(`only ${measured.length} measured: profiles not written`); process.exitCode = 1; }
console.log("PROFILES " + JSON.stringify(body.types));
await db.end();
