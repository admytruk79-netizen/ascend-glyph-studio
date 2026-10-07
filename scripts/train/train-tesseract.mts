/**
 * Training run: learn from the museum images themselves (GitHub Actions; images are fetched, analysed in
 * memory and discarded, never stored).
 *
 *   1. sample analysed corpus objects per focus tradition (open cultural access only; structure-only
 *      traditions are skipped here, they contribute symmetry and rhythm through the style profiles)
 *   2. CLIP: keep real ornament (drop text pages, portraits, landscapes) and tag the motif type
 *      (floral, animals, tree, cross, geometric, amorphous, figures)
 *   3. region from the catalogue text (Ukrainian regions)
 *   4. learn.ts: thread palette, ground, density and motif elements per image
 *   5. per tradition and region: motif codebook (clustered elements, averaged outlines), palette, tag mix
 *
 * Writes out/tesseract-model.json and, with DATABASE_URL, learned_model (the model) and
 * research_image_tag (one row per kept image) in Neon, where the tesseract-engine worker reads them.
 * Env: MASTER_IN, TRAIN_PER_TRADITION (default 600), TRAIN_MAX_MINUTES (default 150), DATABASE_URL.
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import sharp from "sharp";
import { STRUCTURE_ONLY, traditionOf } from "../corpus/profiles.ts";
import { USER_AGENT } from "../corpus/sources.ts";
import { cos, embedImage, embedTexts, MODEL } from "../score/clip.mts";
import { featureOf, hex, kmeans, learnImage, prototypeShape, type Element } from "./learn.ts";
import { MOTIF_TYPES, NOT_ORNAMENT, ORNAMENT, regionOf } from "./labels.ts";

const per = Number(process.env.TRAIN_PER_TRADITION ?? 600);
const deadline = Date.now() + Number(process.env.TRAIN_MAX_MINUTES ?? 150) * 60_000;
const FOCUS = new Set(["Ukrainian", "Belarusian", "Lithuanian", "Western / cowboy material culture", "English (16th–19th c.)"]);

const softmax = (xs: number[]) => { const m = Math.max(...xs), e = xs.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map((x) => x / s); };

async function main() {
  // 1. sample per focus tradition, spread across sources
  const groups = new Map<string, any[]>();
  const stream = createReadStream(process.env.MASTER_IN ?? "master/master.ndjson.gz");
  for await (const line of createInterface({ input: stream.pipe(createGunzip()), crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (!r.image || (r.culturalAccess ?? "open") !== "open") continue;
    const t = traditionOf(r).replace(/ \(by query\)$/, "");
    if (!FOCUS.has(t) || STRUCTURE_ONLY.has(t)) continue;
    const g = groups.get(t) ?? groups.set(t, []).get(t)!;
    if (g.length < per * 2) g.push(r);
  }
  const queue = [...groups.entries()].flatMap(([t, rows]) => rows.map((r) => ({ t, r })));
  // interleave traditions so a time limit still leaves every tradition represented
  queue.sort((a, b) => (groups.get(a.t)!.indexOf(a.r) - groups.get(b.t)!.indexOf(b.r)) || a.t.localeCompare(b.t));
  console.log(JSON.stringify({ sampled: Object.fromEntries([...groups].map(([t, g]) => [t, g.length])) }));

  const prompts = [...ORNAMENT, ...NOT_ORNAMENT], types = Object.keys(MOTIF_TYPES);
  const pe = await embedTexts(prompts), te = await embedTexts(Object.values(MOTIF_TYPES));

  const lastHit = new Map<string, number>();
  async function get(url: string): Promise<Buffer> {
    const host = new URL(url).host, wait = (lastHit.get(host) ?? 0) + 400 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastHit.set(host, Date.now());
    const h: Record<string, string> = { "user-agent": USER_AGENT, accept: "image/jpeg,image/png,image/*;q=0.8" };
    if (url.includes("artic.edu")) h["AIC-User-Agent"] = USER_AGENT;
    const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(String(res.status));
    return Buffer.from(await res.arrayBuffer());
  }

  type Kept = { id: string; tradition: string; region?: string; ornamentP: number; tags: Record<string, number>; palette: { hex: string; share: number }[]; ground: string; density: number; elements: Element[] };
  const kept: Kept[] = [];
  const stats = { seen: 0, kept: 0, notOrnament: 0, failed: 0, perTradition: {} as Record<string, number> };
  const done = new Map<string, number>();
  for (const { t, r } of queue) {
    if (Date.now() > deadline) break;
    if ((done.get(t) ?? 0) >= per) continue;
    stats.seen++;
    try {
      const buf = await get(r.image);
      const png = await sharp(buf).rotate().resize(224, 224, { fit: "inside" }).png().toBuffer();
      const e = await embedImage(png);
      const p = softmax(pe.map((v) => cos(e, v) * 100));
      const ornamentP = p.slice(0, ORNAMENT.length).reduce((a, b) => a + b, 0);
      if (ornamentP < 0.6) { stats.notOrnament++; continue; }
      const tp = softmax(te.map((v) => cos(e, v) * 100));
      const raw = await sharp(buf).rotate().resize(384, 384, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const L = learnImage({ data: raw.data, width: raw.info.width, height: raw.info.height });
      kept.push({
        id: r.id, tradition: t, region: t === "Ukrainian" ? regionOf(r) : undefined, ornamentP: +ornamentP.toFixed(3),
        tags: Object.fromEntries(types.map((k, i) => [k, +tp[i]!.toFixed(3)])),
        palette: L.palette.slice(0, 5).map((s) => ({ hex: hex(s.rgb), share: +s.share.toFixed(3) })), ground: hex(L.ground), density: +L.density.toFixed(3), elements: L.elements,
      });
      done.set(t, (done.get(t) ?? 0) + 1); stats.kept++; stats.perTradition[t] = done.get(t)!;
      if (stats.kept % 100 === 0) console.log(JSON.stringify({ progress: stats }));
    } catch { stats.failed++; }
  }

  // 5. aggregate per tradition and per Ukrainian region
  const groupOf = (key: (k: Kept) => string | undefined) => { const m = new Map<string, Kept[]>(); for (const k of kept) { const g = key(k); if (g) (m.get(g) ?? m.set(g, []).get(g)!).push(k); } return m; };
  const tagMix = (ks: Kept[]) => Object.fromEntries(types.map((ty) => [ty, +(ks.reduce((a, k) => a + k.tags[ty]!, 0) / ks.length).toFixed(3)]));
  const paletteOfGroup = (ks: Kept[]) => {
    const sw = ks.flatMap((k) => k.palette.map((s) => ({ rgb: [1, 3, 5].map((i) => parseInt(s.hex.slice(i, i + 2), 16)), w: s.share })));
    if (!sw.length) return [];
    const { centers, assign } = kmeans(sw.map((s) => s.rgb), Math.min(8, sw.length));
    const total = sw.reduce((a, s) => a + s.w, 0) || 1;
    return centers.map((c, j) => ({ hex: hex(c), share: +(sw.filter((_, i) => assign[i] === j).reduce((a, s) => a + s.w, 0) / total).toFixed(3) })).sort((a, b) => b.share - a.share);
  };
  const codebookOf = (ks: Kept[]) => {
    const els = ks.flatMap((k) => k.elements);
    if (els.length < 30) return [];
    const k = Math.min(40, Math.floor(els.length / 30));
    const { assign } = kmeans(els.map(featureOf), k);
    const out = [];
    for (let j = 0; j < k; j++) {
      const m = els.filter((_, i) => assign[i] === j); if (m.length < 8) continue;
      const avg = (f: (e: Element) => number) => +(m.reduce((a, e) => a + f(e), 0) / m.length).toFixed(3);
      const orders = new Map<number, number>(); for (const e of m) orders.set(e.order, (orders.get(e.order) ?? 0) + 1);
      out.push({ id: `c${j}`, n: m.length, share: +(m.length / els.length).toFixed(3), elong: avg((e) => e.elong), solidity: avg((e) => e.solidity), mirror: avg((e) => e.mirror), size: avg((e) => e.size),
        order: [...orders.entries()].sort((a, b) => b[1] - a[1])[0]![0], colors: paletteOfGroup(m.map((e) => ({ palette: [{ hex: hex(e.color), share: 1 }] }) as any)).slice(0, 3).map((c) => c.hex), shape: prototypeShape(m) });
    }
    return out.sort((a, b) => b.n - a.n);
  };
  const summarise = (ks: Kept[]) => ({ images: ks.length, tags: tagMix(ks), palette: paletteOfGroup(ks), density: +(ks.map((k) => k.density).sort((a, b) => a - b)[Math.floor(ks.length / 2)] ?? 0).toFixed(3), elementsPerImage: +(ks.reduce((a, k) => a + k.elements.length, 0) / ks.length).toFixed(1), codebook: codebookOf(ks) });
  const model = {
    version: "tesseract-learned/0.1", builtAt: new Date().toISOString(), clip: MODEL, stats,
    traditions: Object.fromEntries([...groupOf((k) => k.tradition)].map(([t, ks]) => [t, summarise(ks)])),
    regions: Object.fromEntries([...groupOf((k) => k.region)].filter(([, ks]) => ks.length >= 5).map(([r, ks]) => [r, summarise(ks)])),
  };
  mkdirSync("out", { recursive: true });
  writeFileSync("out/tesseract-model.json", JSON.stringify(model));
  console.log("TRAINED " + JSON.stringify({ stats, traditions: Object.fromEntries(Object.entries(model.traditions).map(([t, v]: any) => [t, { images: v.images, codebook: v.codebook.length, tags: v.tags }])), regions: Object.fromEntries(Object.entries(model.regions).map(([r, v]: any) => [r, { images: v.images, tags: v.tags }])) }));

  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
    pool.on("error", () => {});
    await pool.query(`insert into learned_model(id, built_at, body) values($1, now(), $2::jsonb) on conflict (id) do update set built_at = now(), body = excluded.body`, ["tesseract-learned-latest", JSON.stringify(model)]);
    for (let i = 0; i < kept.length; i += 200) {
      const batch = kept.slice(i, i + 200);
      await pool.query(
        `insert into research_image_tag(object_id, tradition, region, ornament_p, tags, palette, ground, density, n_elements, model)
         select * from jsonb_to_recordset($1::jsonb) as x(object_id text, tradition text, region text, ornament_p numeric, tags jsonb, palette jsonb, ground text, density numeric, n_elements int, model text)
         on conflict (object_id) do update set tradition = excluded.tradition, region = excluded.region, ornament_p = excluded.ornament_p, tags = excluded.tags, palette = excluded.palette, ground = excluded.ground, density = excluded.density, n_elements = excluded.n_elements, model = excluded.model, tagged_at = now()`,
        [JSON.stringify(batch.map((k) => ({ object_id: k.id, tradition: k.tradition, region: k.region ?? null, ornament_p: k.ornamentP, tags: k.tags, palette: k.palette, ground: k.ground, density: k.density, n_elements: k.elements.length, model: MODEL })))],
      );
    }
    await pool.end();
    console.log(`NEON learned_model + ${kept.length} research_image_tag rows`);
  }
}

if (process.argv[1]?.endsWith("train-tesseract.mts")) main().catch((e) => { console.error(e); process.exitCode = 1; });
