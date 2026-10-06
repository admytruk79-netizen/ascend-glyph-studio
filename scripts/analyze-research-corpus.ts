/**
 * Image-analysis stage of the research corpus.
 *
 * Reads metadata-accepted candidates, downloads each image, converts it into
 * structural observations (see scripts/corpus/features.ts), deconstructs it
 * into crop, bands, repeat unit, frieze/wallpaper symmetry, breaks and grammar
 * (see scripts/corpus/deconstruct.ts), and drops failed,
 * low-information and near-duplicate images. Images are analyzed in memory and
 * never stored; only features, a perceptual hash and provenance are written.
 * Rows written here are the accepted, analyzed instances that count toward the
 * corpus milestones.
 *
 * Input rows may be harvest candidates or master-corpus rows queued for
 * re-analysis (rows analyzed before deconstruction existed).
 *
 * Env: CORPUS_IN, ANALYZED_OUT, ANALYSIS_SUMMARY_OUT, ANALYSIS_CONCURRENCY (16),
 * ANALYSIS_LIMIT, ANALYSIS_MAX_MINUTES (300).
 */
import { createReadStream, createWriteStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import sharp from "sharp";
import { deconstruct, DECONSTRUCTION_VERSION, type Deconstruction } from "./corpus/deconstruct.ts";
import { dHash, dHashVertical, NearDuplicateIndex, structuralFeatures } from "./corpus/features.ts";
import { USER_AGENT } from "./corpus/sources.ts";

const input = process.env.CORPUS_IN ?? "data/research/corpus.ndjson";
const out = process.env.ANALYZED_OUT ?? "data/research/analyzed.ndjson";
const summaryOut = process.env.ANALYSIS_SUMMARY_OUT ?? "data/research/analysis-summary.json";
const concurrency = Number(process.env.ANALYSIS_CONCURRENCY ?? 16);
const limit = Number(process.env.ANALYSIS_LIMIT ?? Infinity);
const deadline = Date.now() + Number(process.env.ANALYSIS_MAX_MINUTES ?? 300) * 60_000;
const ANALYZER_VERSION = `structural-features/0.1+${DECONSTRUCTION_VERSION}`;
const MAX_BYTES = 20 * 1024 * 1024;
const MIN_EDGE = 600, ANALYSIS_EDGE = 160, DECONSTRUCT_EDGE = 512;

type Row = {
  id: string; source: string; image?: string; objectURL?: string; accession?: string; tradition?: string;
  institution?: string; relevance?: string[]; raw?: Record<string, unknown>;
};

const stats = {
  analyzerVersion: ANALYZER_VERSION, read: 0, analyzed: 0,
  rejected: {} as Record<string, number>, rejectedBySource: {} as Record<string, number>, bySource: {} as Record<string, number>,
  dominantAxis: {} as Record<string, number>, kind: {} as Record<string, number>, friezeGroups: {} as Record<string, number>,
  wallpaperRotation: {} as Record<string, number>, deconstructErrors: 0, skippedRepeats: 0, startedAt: new Date().toISOString(), finishedAt: "", stopReason: "",
};
const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Image hosts throttle or reset bursts from one client, so cap in-flight downloads per host.
const PER_HOST = Number(process.env.ANALYSIS_PER_HOST ?? 6);
const hostSlots = new Map<string, { active: number; waiting: (() => void)[] }>();
async function withHostSlot<T>(host: string, fn: () => Promise<T>): Promise<T> {
  let h = hostSlots.get(host);
  if (!h) hostSlots.set(host, (h = { active: 0, waiting: [] }));
  if (h.active >= PER_HOST) await new Promise<void>((r) => h!.waiting.push(r));
  h.active++;
  try { return await fn(); } finally { h.active--; h.waiting.shift()?.(); }
}

function headersFor(url: string): Record<string, string> {
  const h: Record<string, string> = { "user-agent": USER_AGENT, accept: "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8" };
  // The Art Institute of Chicago asks API and IIIF clients to identify themselves with this header.
  if (url.includes("artic.edu")) h["AIC-User-Agent"] = USER_AGENT;
  return h;
}

async function download(url: string): Promise<Buffer> {
  const host = new URL(url).host;
  return withHostSlot(host, async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetch(url, { headers: headersFor(url), signal: AbortSignal.timeout(45_000) });
        if (!r.ok) {
          if (attempt < 3 && (r.status === 429 || r.status >= 500)) { await sleep(3000 * 2 ** attempt); continue; }
          throw new Error(`http-${r.status}`);
        }
        const len = Number(r.headers.get("content-length") ?? 0);
        if (len > MAX_BYTES) throw new Error("too-large");
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > MAX_BYTES) throw new Error("too-large");
        return buf;
      } catch (e) {
        const err = e as Error & { cause?: { code?: string } };
        if (err.message.startsWith("http-") || err.message === "too-large") throw err;
        // Network-level failures (resets, DNS, timeouts) get a backoff and retry, then report their cause code.
        if (attempt < 3) { await sleep(2000 * 2 ** attempt); continue; }
        throw new Error(`net-${err.cause?.code ?? err.name ?? "error"}`);
      }
    }
  });
}

async function analyze(row: Row, dupes: NearDuplicateIndex) {
  if (!row.image) throw new Error("no-image");
  let buf: Buffer;
  try { buf = await download(row.image); } catch (e) { throw new Error(`download-${(e as Error).message}`.replace("download-download-", "download-")); }
  let meta;
  try { meta = await sharp(buf).metadata(); } catch { throw new Error("corrupt-image"); }
  const width = meta.width ?? 0, height = meta.height ?? 0;
  // IIIF requests are capped at 843px wide, so judge size on the longer delivered edge.
  if (Math.max(width, height) < MIN_EDGE) throw new Error("image-too-small");
  const small = await sharp(buf).rotate().grayscale().resize(ANALYSIS_EDGE, ANALYSIS_EDGE, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const hRaster = await sharp(buf).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  const vRaster = await sharp(buf).grayscale().resize(8, 9, { fit: "fill" }).raw().toBuffer();
  const features = structuralFeatures({ data: small.data, width: small.info.width, height: small.info.height });
  if (features.contrast < 0.03) throw new Error("low-information");
  if (features.edgeDensity < 0.01) throw new Error("no-structure");
  // 128-bit hash (horizontal + vertical gradients) so banded and striped patterns don't collide.
  const hash = dHash({ data: hRaster, width: 9, height: 8 }) + dHashVertical({ data: vRaster, width: 8, height: 9 });
  if (dupes.findOrAdd(hash)) throw new Error("near-duplicate");
  let deconstruction: Deconstruction | null = null;
  try {
    const big = await sharp(buf).rotate().grayscale().resize(DECONSTRUCT_EDGE, DECONSTRUCT_EDGE, { fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
    deconstruction = deconstruct({ data: big.data, width: big.info.width, height: big.info.height });
  } catch { stats.deconstructErrors++; }
  return { width, height, features, dhash: hash, deconstruction };
}

async function main() {
  const rl = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  const stream = createWriteStream(out, { flags: "w" });
  const dupes = new NearDuplicateIndex(6);
  const inflight = new Set<Promise<void>>();
  const seenIds = new Set<string>();

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (stats.read >= limit) { stats.stopReason = "limit reached"; break; }
    if (Date.now() > deadline) { stats.stopReason = "time budget reached"; break; }
    const row = JSON.parse(line) as Row;
    if (seenIds.has(row.id)) { stats.skippedRepeats++; continue; }
    seenIds.add(row.id);
    stats.read++;
    const p = analyze(row, dupes).then((a) => {
      stream.write(JSON.stringify({
        id: row.id, source: row.source, institution: row.institution ?? row.raw?.institution, objectURL: row.objectURL, accession: row.accession,
        tradition: row.tradition, image: row.image, relevance: row.relevance ?? row.raw?.relevance, width: a.width, height: a.height,
        dhash: a.dhash, features: a.features, deconstruction: a.deconstruction, stage: "analyzed", analyzerVersion: ANALYZER_VERSION, analyzedAt: new Date().toISOString(),
      }) + "\n");
      stats.analyzed++; bump(stats.bySource, row.source); bump(stats.dominantAxis, a.features.dominantAxis);
      const d = a.deconstruction;
      if (d) {
        bump(stats.kind, d.kind);
        for (const b of d.bands) bump(stats.friezeGroups, b.frieze.group);
        if (d.wallpaper) bump(stats.wallpaperRotation, String(d.wallpaper.rotationOrder));
      }
      if (stats.analyzed % 1000 === 0) console.log(JSON.stringify({ checkpoint: stats.analyzed, read: stats.read }));
    }).catch((e) => {
      const reason = String((e as Error).message ?? e).slice(0, 40);
      bump(stats.rejected, reason); bump(stats.rejectedBySource, `${row.source}:${reason}`);
    })
      .finally(() => inflight.delete(p));
    inflight.add(p);
    if (inflight.size >= concurrency) await Promise.race(inflight);
  }
  await Promise.all(inflight);
  stats.stopReason ||= "input exhausted";
  stats.finishedAt = new Date().toISOString();
  await new Promise((r) => stream.end(r));
  writeFileSync(summaryOut, JSON.stringify(stats, null, 2));
  console.log("ANALYSIS " + JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
