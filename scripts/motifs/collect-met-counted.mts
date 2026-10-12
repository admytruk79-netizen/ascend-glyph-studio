/**
 * Met Open Access → counted-motif candidates for review. Runs on a GitHub runner (museum hosts are reachable there).
 *
 *  - searches the Met for Ukrainian embroidery and counted work; keeps objects the API marks public domain (CC0);
 *  - the tradition comes only from the object's own catalogue fields (culture, country, region, title), never from the
 *    search words, so a query cannot label an object Ukrainian;
 *  - each image is read in memory (never stored), downscaled, and passed to the motif-learner grid extractor, on the
 *    whole image and on centre crops; the best confident read is kept;
 *  - every record is written with culturalAccess "review": nothing trains on it until a person checks the read,
 *    the attribution and the documented region.
 *
 * Output: data/motifs/met/candidates.json (every object seen, with why it was or was not read),
 *         data/motifs/met/met-counted.unreviewed.json (motif records), data/motifs/met/review-sheet.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { extractGrid } from "../../packages/motif-learner/src/extract.ts";
import { components, density, toChart, toSvg, type Grid } from "../../packages/motif-learner/src/grid.ts";
import { detectSymmetry } from "../../packages/motif-learner/src/symmetry.ts";
import type { MotifRecord } from "../../packages/motif-learner/src/model.ts";

const API = "https://collectionapi.metmuseum.org/public/collection/v1";
const QUERIES = ["Ukrainian embroidery", "Ukrainian", "Ukraine embroidered", "Ukrainian towel", "Ukrainian shirt", "Ukrainian textile", "rushnyk", "Ukrainian cross stitch", "Hutsul", "Ukraine textile"];
const MAX_PER_QUERY = Number(process.env.MET_MAX_PER_QUERY ?? 120);
const OUT = "data/motifs/met";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json(url: string): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "ASCEND-motif-learner/0.1 (provenance-first research)" } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i >= 3) throw e; await sleep(2000 * (i + 1)); }
  }
}

const UA = /ukrain|ucrain|hutsul|gutsul|carpatho-ruth|rusyn|poltava|podil|bukovyn|volyn|kyiv|kiev|chernihiv|lviv|galicia/i;
const TEXTILE = /embroider|cross[- ]?stitch|counted|sampler|textile|towel|shirt|sleeve|linen|cotton|wool|silk|needlework/i;

type Seen = { objectId: number; title: string; culture: string; country: string; region: string; date: string; medium: string; classification: string; objectUrl: string; imageUrl: string; uaEvidence: string | null; status: string; confidence?: number; size?: string };

function attribution(o: any): string | null {
  for (const k of ["culture", "country", "region", "subregion", "state", "city", "title"]) if (typeof o[k] === "string" && UA.test(o[k])) return `${k}: ${o[k]}`;
  return null;
}

/** Best confident grid read over the whole image and a few centre crops, at two working sizes. */
async function readImage(url: string): Promise<{ grid: Grid; confidence: number; pitch: [number, number]; crop: string } | null> {
  const r = await fetch(url, { headers: { "User-Agent": "ASCEND-motif-learner/0.1" } });
  if (!r.ok) throw new Error(`image HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 0, H = meta.height ?? 0;
  let best: { grid: Grid; confidence: number; pitch: [number, number]; crop: string } | null = null;
  for (const frac of [1, 0.6, 0.35]) for (const work of [900, 1600]) {
    const cw = Math.round(W * frac), ch = Math.round(H * frac), left = (W - cw) >> 1, top = (H - ch) >> 1;
    const { data, info } = await sharp(buf).extract({ left, top, width: cw, height: ch }).resize({ width: Math.min(work, cw), withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const got = extractGrid({ width: info.width, height: info.height, data, channels: 3 }, { minConfidence: 0.35 });
    if (!got) continue;
    const g = got.grid, ok = g.w >= 5 && g.h >= 5 && g.w <= 150 && g.h <= 150 && density(g) > 0.03 && density(g) < 0.9;
    if (ok && (!best || got.confidence > best.confidence)) best = { ...got, crop: `centre ${Math.round(frac * 100)}% at ${info.width}px` };
  }
  return best;
}

const ids = new Set<number>();
for (const q of QUERIES) {
  const s = await json(`${API}/search?hasImages=true&q=${encodeURIComponent(q)}`);
  (s?.objectIDs ?? []).slice(0, MAX_PER_QUERY).forEach((id: number) => ids.add(id));
  await sleep(150);
}
console.log(`search: ${ids.size} object ids`);

const seen: Seen[] = [], records: MotifRecord[] = [], tiles: string[] = [];
for (const id of [...ids].sort((a, b) => a - b)) {
  let o: any;
  try { o = await json(`${API}/objects/${id}`); } catch (e) { console.error("skip", id, String(e)); continue; }
  await sleep(120);
  if (!o) continue;
  const row: Seen = { objectId: id, title: o.title ?? "", culture: o.culture ?? "", country: o.country ?? "", region: o.region ?? "", date: o.objectDate ?? "", medium: o.medium ?? "", classification: o.classification ?? "", objectUrl: o.objectURL ?? "", imageUrl: o.primaryImage ?? "", uaEvidence: attribution(o), status: "" };
  seen.push(row);
  if (o.isPublicDomain !== true) { row.status = "not-public-domain"; continue; }
  if (!o.primaryImage) { row.status = "no-image"; continue; }
  if (!row.uaEvidence) { row.status = "no-ukrainian-attribution-in-catalogue"; continue; }
  if (!TEXTILE.test(`${row.medium} ${row.classification} ${row.title}`)) { row.status = "not-textile"; continue; }
  let read: Awaited<ReturnType<typeof readImage>> = null;
  try { read = await readImage(o.primaryImage); } catch (e) { row.status = `image-error: ${String(e)}`; continue; }
  if (!read) { row.status = "no-counted-grid-read"; continue; }
  row.status = "grid-read"; row.confidence = +read.confidence.toFixed(3); row.size = `${read.grid.w}x${read.grid.h}`;
  const rec: MotifRecord = {
    id: `met-${id}`, name: row.title, tradition: "Ukrainian", region: null, technique: "unverified-counted", sourceGroup: `met-${id}`,
    chart: toChart(read.grid),
    provenance: {
      kind: "museum-object", licence: "CC0", culturalAccess: "review", independentSource: true, url: row.objectUrl,
      note: `Met Open Access (isPublicDomain). Attribution from catalogue ${row.uaEvidence}. Date ${row.date}; medium ${row.medium}. Grid read automatically (${read.crop}, pitch ${read.pitch.join("×")} px, confidence ${read.confidence.toFixed(2)}, symmetry ${detectSymmetry(read.grid)}, ${components(read.grid)} islands): check against the photograph, crop to the motif, set technique and documented region, then set culturalAccess to open.`,
    },
  };
  records.push(rec);
  tiles.push(`<g transform="translate(0,${tiles.length * 0})">${toSvg(read.grid, 4, `met ${id} · ${row.title.slice(0, 40)} · conf ${read.confidence.toFixed(2)}`)}</g>`);
  console.log(`read met ${id} ${row.size} conf ${row.confidence} — ${row.title}`);
}

mkdirSync(OUT, { recursive: true });
const counts = seen.reduce<Record<string, number>>((m, s) => { const k = s.status.split(":")[0]!; m[k] = (m[k] ?? 0) + 1; return m; }, {});
writeFileSync(`${OUT}/candidates.json`, JSON.stringify({ schema: "ascend.met-counted-candidates.v1", queries: QUERIES, counts, objects: seen }, null, 1) + "\n");
writeFileSync(`${OUT}/met-counted.unreviewed.json`, JSON.stringify({ schema: "ascend.motif-records.v1", records }, null, 1) + "\n");
// stack review tiles vertically
let y = 0; const body: string[] = [];
for (const t of tiles) { const h = Number(/height="(\d+)"/.exec(t)?.[1] ?? 0); body.push(t.replace('translate(0,0)', `translate(0,${y})`)); y += h + 12; }
const w = Math.max(200, ...tiles.map((t) => Number(/width="(\d+)"/.exec(t)?.[1] ?? 0)));
writeFileSync(`${OUT}/review-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.max(20, y)}"><rect width="100%" height="100%" fill="#fff"/>${body.join("")}</svg>\n`);
console.log(JSON.stringify({ objects: seen.length, counts, records: records.length }));
