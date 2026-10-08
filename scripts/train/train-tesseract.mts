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
 *
 * Full corpus in parallel: TRAIN_MODE=extract with TRAIN_SHARDS=n, TRAIN_SHARD=i takes every open-access image
 * whose id hashes to shard i (all traditions; motif elements kept for the focus traditions), writes its image
 * tags to Neon as it goes and out/shard-i.json.gz; TRAIN_MODE=merge reads SHARDS_IN/*.json.gz and builds the model.
 */
import { createReadStream, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createGunzip, gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import sharp from "sharp";
import { STRUCTURE_ONLY, traditionOf } from "../corpus/profiles.ts";
import { USER_AGENT } from "../corpus/sources.ts";
import { featureOf, hex, kmeans, learnImage, prototypeShape, type Element } from "./learn.ts";
import { assemble, brickSignatures, grammarOf, scalesOf, type Assembly } from "./lego.ts";
import { CLIP_MODEL as MODEL, MOTIF_TYPES, NOT_ORNAMENT, ORNAMENT, regionOf } from "./labels.ts";
import { BRICKS } from "../../packages/blend-engine/src/lego.ts";

const per = Number(process.env.TRAIN_PER_TRADITION ?? 600);
const maxImages = Number(process.env.TRAIN_MAX_IMAGES ?? 25000);
const deadline = Date.now() + Number(process.env.TRAIN_MAX_MINUTES ?? 150) * 60_000;

const softmax = (xs: number[]) => { const m = Math.max(...xs), e = xs.map((x) => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map((x) => x / s); };

// traditions whose motif elements are kept for the codebook, and which a shard learns first
const FOCUS = new Set(["Ukrainian", "Belarusian", "Lithuanian", "Western / cowboy material culture", "English (16th–19th c.)"]);
const MODE = process.env.TRAIN_MODE ?? "all", SHARDS = Number(process.env.TRAIN_SHARDS ?? 1), SHARD = Number(process.env.TRAIN_SHARD ?? 0);
const shardOf = (id: string) => createHash("md5").update(id).digest().readUInt32BE(0) % SHARDS;
type Kept = { id: string; tradition: string; region?: string; ornamentP: number; tags: Record<string, number>; palette: { hex: string; share: number }[]; ground: string; density: number; elements: Element[]; lego?: Assembly };
type Stats = { seen: number; kept: number; notOrnament: number; failed: number; perTradition: Record<string, number> };

async function pool() {
  const { default: pg } = await import("pg");
  const p = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
  p.on("error", () => {});
  return p;
}
async function writeTags(db: any, ks: Kept[]) {
  for (let i = 0; i < ks.length; i += 200) {
    const batch = ks.slice(i, i + 200);
    await db.query(
      `insert into research_image_tag(object_id, tradition, region, ornament_p, tags, palette, ground, density, n_elements, model)
       select * from jsonb_to_recordset($1::jsonb) as x(object_id text, tradition text, region text, ornament_p numeric, tags jsonb, palette jsonb, ground text, density numeric, n_elements int, model text)
       on conflict (object_id) do update set tradition = excluded.tradition, region = excluded.region, ornament_p = excluded.ornament_p, tags = excluded.tags, palette = excluded.palette, ground = excluded.ground, density = excluded.density, n_elements = excluded.n_elements, model = excluded.model, tagged_at = now()`,
      [JSON.stringify(batch.map((k) => ({ object_id: k.id, tradition: k.tradition, region: k.region ?? null, ornament_p: k.ornamentP, tags: k.tags, palette: k.palette, ground: k.ground, density: k.density, n_elements: k.elements.length, model: MODEL })))],
    );
  }
}

async function main() {
  let kept: Kept[] = [];
  let stats: Stats = { seen: 0, kept: 0, notOrnament: 0, failed: 0, perTradition: {} };
  if (MODE === "merge") {
    const dir = process.env.SHARDS_IN ?? "shards";
    const files = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith(".json.gz"));
    for (const f of files) {
      const d = JSON.parse(gunzipSync(readFileSync(`${dir}/${f}`)).toString());
      kept.push(...d.kept);
      for (const k of ["seen", "kept", "notOrnament", "failed"] as const) stats[k] += d.stats[k];
      for (const [t, n] of Object.entries(d.stats.perTradition as Record<string, number>)) stats.perTradition[t] = (stats.perTradition[t] ?? 0) + n;
    }
    console.log(JSON.stringify({ merged: files.length, stats }));
    // never replace a working model with one learned from a run that mostly failed
    const minKept = Number(process.env.TRAIN_MIN_KEPT ?? 2000);
    if (kept.length < minKept) { console.error(`only ${kept.length} images kept (need ${minKept}): model not written`); process.exitCode = 1; return; }
  } else ({ kept, stats } = await extract());
  if (MODE === "extract") return;
  await aggregate(kept, stats);
}

/**
 * The corpus to learn from. TRAIN_SOURCE=neon reads every object straight from research_corpus_object, so a run sees
 * everything harvested so far (a harvest writes Neon before its slow analysis step finishes); otherwise the master
 * corpus file from the last successful harvest (MASTER_IN).
 */
async function* records(): AsyncGenerator<any> {
  if (process.env.TRAIN_SOURCE === "neon") {
    const db = await pool();
    const { rows } = await db.query(`select o.id, o.image_url as image, coalesce(o.cultural_access, 'open') as "culturalAccess", o.tradition, o.title, o.region,
      o.raw->>'culture' as culture, o.raw->>'institution' as institution, coalesce(a.split,'train') as split
      from research_corpus_object o left join research_corpus_analysis a on a.id=o.id where o.image_url is not null`);
    await db.end();
    console.log(JSON.stringify({ source: "neon", objects: rows.length }));
    yield* rows;
    return;
  }
  const stream = createReadStream(process.env.MASTER_IN ?? "master/master.ndjson.gz");
  for await (const line of createInterface({ input: stream.pipe(createGunzip()), crlfDelay: Infinity })) if (line.trim()) yield JSON.parse(line);
}

async function extract(): Promise<{ kept: Kept[]; stats: Stats }> {
  // 1. select: per focus tradition (sampled) or, in a shard, every open-access image whose id hashes to it
  const groups = new Map<string, any[]>();
  for await (const r of records()) {
    if (!r.image || (r.culturalAccess ?? "open") !== "open" || (r.split && r.split !== "train")) continue;
    const t = traditionOf(r).replace(/ \(by query\)$/, "");
    if (STRUCTURE_ONLY.has(t)) continue;
    if (MODE === "extract" && shardOf(r.id) !== SHARD) continue;
    const g = groups.get(t) ?? groups.set(t, []).get(t)!;
    if (MODE === "extract" || g.length < per * 2) g.push(r);
  }
  const queue = [...groups.entries()].flatMap(([t, rows]) => rows.map((r) => ({ t, r })));
  // Interleave all eligible traditions so large museum collections cannot crowd
  // smaller traditions out of the image-learning budget.
  // Focus traditions first (the time limit may stop a shard before the end), "Other" last; within that, rank in
  // its own group, so smaller traditions are not crowded out. Ranks are precomputed (indexOf in a sort is quadratic).
  const rank = new Map<any, number>(); for (const g of groups.values()) g.forEach((r, i) => rank.set(r, i));
  const tier = (t: string) => (t === "Other" || t === "Unlabelled" ? 1 : 0);
  queue.sort((a, b) => tier(a.t) - tier(b.t) || rank.get(a.r)! - rank.get(b.r)! || a.t.localeCompare(b.t));
  console.log(JSON.stringify({ sampled: Object.fromEntries([...groups].map(([t, g]) => [t, g.length])) }));

  // the vision model is only needed to extract (merging works without it)
  const { cos, embedImage, embedTexts } = await import("../score/clip.mts");
  const prompts = [...ORNAMENT, ...NOT_ORNAMENT], types = Object.keys(MOTIF_TYPES);
  const pe = await embedTexts(prompts), te = await embedTexts(Object.values(MOTIF_TYPES));

  const lastHit = new Map<string, number>();
  // a host that keeps failing (blocked, or too slow to answer) is dropped for the rest of the run, so it cannot
  // eat the shard's time budget one 20-second timeout at a time
  const strikes = new Map<string, number>(), dropped = new Set<string>(), hostMs = new Map<string, [number, number]>();
  async function get(url: string): Promise<Buffer> {
    // archive.org's IIIF server cuts each page scan on request: ask for the size we use, not 1600 px
    if (url.includes("iiif.archive.org/")) url = url.replace(/\/full\/(!?\d*,\d*|max|full)\/0\/default\.(jpg|png)$/, "/full/!512,512/0/default.$2");
    const host = new URL(url).host;
    if (dropped.has(host)) throw new Error(`host ${host} dropped`);
    // several shards run at once: pace each host more gently per shard
    const wait = (lastHit.get(host) ?? 0) + (MODE === "extract" ? 650 : 400) - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastHit.set(host, Date.now());
    const h: Record<string, string> = { "user-agent": USER_AGENT, accept: "image/jpeg,image/png,image/*;q=0.8" };
    if (url.includes("artic.edu")) h["AIC-User-Agent"] = USER_AGENT;
    try {
      const t0 = Date.now();
      const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(20_000) });
      const hm = hostMs.get(host) ?? [0, 0]; hostMs.set(host, [hm[0] + Date.now() - t0, hm[1] + 1]);
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      strikes.set(host, 0);
      return buf;
    } catch (e) {
      const n = (strikes.get(host) ?? 0) + 1;
      strikes.set(host, n);
      if (n >= 25) { dropped.add(host); console.log(JSON.stringify({ droppedHost: host, after: n, last: String((e as Error).message).slice(0, 80) })); }
      throw e;
    }
  }

  // Lego pieces: brick signatures once per shard, then every kept image is read as an assembly of pieces
  const sigs = await brickSignatures(), sigScale = scalesOf(sigs);
  const kept: Kept[] = [];
  const stats: Stats = { seen: 0, kept: 0, notOrnament: 0, failed: 0, perTradition: {} };
  const done = new Map<string, number>();
  const db = MODE === "extract" && process.env.DATABASE_URL ? await pool() : null;
  let flushed = 0;
  // heartbeat: progress and fetch time per host, every minute, so a slow source is visible in the log
  const beat = setInterval(() => console.log(JSON.stringify({ beat: stats, hosts: Object.fromEntries([...hostMs].map(([hh, [ms, n]]) => [hh, { n, avgMs: Math.round(ms / n) }])), dropped: [...dropped] })), 60_000);
  for (const { t, r } of queue) {
    // a shard takes everything it is given; the single-job mode keeps its per-tradition and total budgets
    if (Date.now() > deadline || (MODE !== "extract" && kept.length >= maxImages)) break;
    if (MODE !== "extract" && (done.get(t) ?? 0) >= per) continue;
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
      const img = { data: raw.data, width: raw.info.width, height: raw.info.height };
      const L = learnImage(img);
      const A = assemble(img, sigs, sigScale, 40, L);
      kept.push({
        id: r.id, tradition: t, region: t === "Ukrainian" ? regionOf(r) : undefined, ornamentP: +ornamentP.toFixed(3),
        tags: Object.fromEntries(types.map((k, i) => [k, +tp[i]!.toFixed(3)])),
        palette: L.palette.slice(0, 5).map((s) => ({ hex: hex(s.rgb), share: +s.share.toFixed(3) })), ground: hex(L.ground), density: +L.density.toFixed(3),
        // motif elements are only clustered for the focus traditions; keep the shard files small otherwise
        elements: FOCUS.has(t) ? L.elements.map((e) => ({ ...e, profile: e.profile.map((v) => +v.toFixed(3)) })) : [],
        // pieces without their shape vectors (novel ones keep theirs, for clustering into new bricks)
        lego: { ...A, pieces: A.pieces.map((p) => (p.brick === "novel" ? p : { ...p, f: undefined })) },
      });
      done.set(t, (done.get(t) ?? 0) + 1); stats.kept++; stats.perTradition[t] = done.get(t)!;
      if (stats.kept % 100 === 0) console.log(JSON.stringify({ progress: stats }));
      // write tags as we go, so a time limit never loses finished work
      if (db && kept.length - flushed >= 100) { await writeTags(db, kept.slice(flushed)).catch((e) => console.log(JSON.stringify({ neonRetryLater: String(e.message).slice(0, 80) }))); flushed = kept.length; }
    } catch (e) {
      // a failed download is normal; anything else is a bug, so show the first few instead of counting them silently
      stats.failed++;
      if (stats.failed <= 5) console.log(JSON.stringify({ failed: r.id, error: String((e as Error)?.stack ?? e).slice(0, 300) }));
    }
  }
  clearInterval(beat);
  if (MODE === "extract") {
    if (db) { await writeTags(db, kept.slice(flushed)); await db.end(); }
    mkdirSync("out", { recursive: true });
    writeFileSync(`out/shard-${SHARD}.json.gz`, gzipSync(JSON.stringify({ shard: SHARD, of: SHARDS, stats, kept })));
    console.log("SHARD " + JSON.stringify({ shard: SHARD, of: SHARDS, stats }));
  }
  return { kept, stats };
}


type AssemblyRole="hero"|"companion"|"filler"|"frame"|"connector";
function deriveAssemblyPrior(lego:any,sourceModel:string){
 const roleOf=(id:string):AssemblyRole=>{
  if(id==="border")return "frame";
  const b=(BRICKS as any)[id];
  if(b?.scale==="hero")return "hero";
  if(b?.scale==="companion")return "companion";
  if(b?.scale==="filler")return "filler";
  return "connector";
 };
 const roleWeights:Partial<Record<AssemblyRole,number>>={};
 for(const [id,b] of Object.entries<any>(lego.bricks??{})){
  const r=roleOf(id);roleWeights[r]=(roleWeights[r]??0)+Math.max(.001,Number(b.share||0));
 }
 const adjacency:Partial<Record<AssemblyRole,Partial<Record<AssemblyRole,number>>>>={};
 const ratios:number[]=[];let pairEvidence=0,axial=0,diagonal=0;
 for(const [key,v] of Object.entries<any>(lego.pairs??{})){
  const [a,b]=key.split("|"),ra=roleOf(a||""),rb=roleOf(b||"");
  const n=Math.max(0,Number(v.n||0));if(!n)continue;
  pairEvidence+=n;
  const row=(adjacency[ra]??={});row[rb]=(row[rb]??0)+n;
  const dx=Math.abs(Number(v.dx||0)),dy=Math.abs(Number(v.dy||0));
  if(Math.max(dx,dy)>=Math.min(dx,dy)*2)axial+=n;else diagonal+=n;
  const r=Number(v.ratio||0);if(Number.isFinite(r)&&r>0)ratios.push(r);
 }
 for(const row of Object.values(adjacency))if(row){
  const sum=Object.values(row).reduce((s,x)=>s+Number(x||0),0)||1;
  for(const k of Object.keys(row) as AssemblyRole[])row[k]=Math.max(.0001,Number(row[k]||0)/sum);
 }
 const median=(xs:number[])=>xs.length?[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]!:0;
 const extents=Object.values<any>(lego.bricks??{}).map(x=>Number(x.extent||0)).filter(x=>x>0).sort((a,b)=>a-b);
 const medExtent=median(extents)||1,maxExtent=extents.at(-1)??medExtent;
 const preferredScaleRatio=median(ratios)||1;
 const spread=median(ratios.map(x=>Math.abs(Math.log(x/preferredScaleRatio))))||.35;
 const repeats=Object.values<any>(lego.repeats??{});
 const regs=repeats.map(x=>Number(x.regularity||0)).filter(Number.isFinite);
 const gaps=repeats.map(x=>Number(x.gap||0)).filter(x=>x>0);
 const dirTotal=axial+diagonal||1;
 return {
  hierarchyStrength:Math.max(0,Math.min(1,(maxExtent/medExtent-1)/4)),
  adjacencyDensity:Math.min(1,Object.keys(lego.pairs??{}).length/360),
  axialBias:axial/dirTotal,diagonalBias:diagonal/dirTotal,
  repeatRegularity:regs.length?regs.reduce((a,b)=>a+b,0)/regs.length:0,
  repeatGap:median(gaps)||.15,scaleRatioMedian:preferredScaleRatio,scaleRatioSpread:spread,
  evidencePairs:pairEvidence,evidenceBricks:Object.keys(lego.bricks??{}).length,
  sourceModel,roleWeights,adjacency
 };
}

async function aggregate(kept: Kept[], stats: Stats) {
  const types = Object.keys(MOTIF_TYPES);

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
  const legoAll=grammarOf(kept.flatMap((k) => (k.lego ? [k.lego] : [])));
  const version="tesseract-learned/0.4-collapse";
  const model = {
    version, builtAt: new Date().toISOString(), clip: MODEL, stats,
    traditions: Object.fromEntries([...groupOf((k) => k.tradition)].map(([t, ks]) => [t, summarise(ks)])),
    regions: Object.fromEntries([...groupOf((k) => k.region)].filter(([, ks]) => ks.length >= 5).map(([r, ks]) => [r, summarise(ks)])),
    assemblyPrior:deriveAssemblyPrior(legoAll,version),
    // Lego grammar is retained as evidence; generation consumes only abstract assembly statistics.
    lego: {
      all: legoAll,
      traditions: Object.fromEntries([...groupOf((k) => k.tradition)].map(([t, ks]) => [t, grammarOf(ks.flatMap((k) => (k.lego ? [k.lego] : [])))])),
      regions: Object.fromEntries([...groupOf((k) => k.region)].filter(([, ks]) => ks.length >= 5).map(([r, ks]) => [r, grammarOf(ks.flatMap((k) => (k.lego ? [k.lego] : [])))])),
    },
  };
  mkdirSync("out", { recursive: true });
  writeFileSync("out/tesseract-model.json", JSON.stringify(model));
  console.log("TRAINED " + JSON.stringify({ stats, traditions: Object.fromEntries(Object.entries(model.traditions).map(([t, v]: any) => [t, { images: v.images, codebook: v.codebook.length, tags: v.tags }])), regions: Object.fromEntries(Object.entries(model.regions).map(([r, v]: any) => [r, { images: v.images, tags: v.tags }])) }));

  if (process.env.DATABASE_URL) {
    const db = await pool();
    const traditionCount=Object.keys(model.traditions).length;
    const imageCount=stats.kept;
    const pairCount=Object.keys(model.lego.all.pairs??{}).length;
    const brickCount=Object.keys(model.lego.all.bricks??{}).length;
    const corpusQ=await db.query("select count(*)::int n from research_corpus_object where image_url is not null");
    const splitQ=await db.query("select count(*)::int n,min(id) lo,max(id) hi from research_corpus_analysis where split='holdout'");
    const corpusCount=Number(corpusQ.rows[0]?.n||0);
    const holdoutFingerprint=`${splitQ.rows[0]?.n||0}:${splitQ.rows[0]?.lo||""}:${splitQ.rows[0]?.hi||""}`;
    const activeQ=await db.query("select id,image_count,tradition_count,metrics from tesseract_model_checkpoint where kind='image-learning' and status='active' order by promoted_at desc nulls last,built_at desc limit 1");
    const active=activeQ.rows[0];
    const coveragePass=!active || imageCount>=Math.floor(Number(active.image_count||0)*.8);
    const traditionPass=!active || traditionCount>=Math.floor(Number(active.tradition_count||0)*.9);
    const priorPairs=Number(active?.metrics?.pairCount||0);
    const grammarPass=!active || pairCount>=Math.floor(priorPairs*.75);
    const promote=coveragePass&&traditionPass&&grammarPass;
    const metrics={imageCount,traditionCount,pairCount,brickCount,novelShare:model.lego.all.novelShare,coveragePass,traditionPass,grammarPass};
    const cp=await db.query(`insert into tesseract_model_checkpoint(kind,version,parent_id,status,corpus_count,image_count,tradition_count,holdout_fingerprint,metrics,body,promoted_at)
      values('image-learning',$1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)
      returning id`,[
      model.version+"@"+model.builtAt,
      active?.id??null,
      promote?"active":"candidate",
      corpusCount,imageCount,traditionCount,holdoutFingerprint,JSON.stringify(metrics),JSON.stringify(model),promote?new Date():null
    ]);
    if(promote){
      if(active?.id)await db.query("update tesseract_model_checkpoint set status='archived' where id=$1",[active.id]);
      await db.query(`insert into learned_model(id, built_at, body) values($1, now(), $2::jsonb) on conflict (id) do update set built_at = now(), body = excluded.body`, ["tesseract-learned-latest", JSON.stringify(model)]);
    }
    if (MODE !== "merge") await writeTags(db, kept); // shards already wrote their tags
    await db.end();
    console.log(JSON.stringify({checkpoint:cp.rows[0]?.id,promoted:promote,metrics}));
  }
}

if (process.argv[1]?.endsWith("train-tesseract.mts")) main().catch((e) => { console.error(e); process.exitCode = 1; });
