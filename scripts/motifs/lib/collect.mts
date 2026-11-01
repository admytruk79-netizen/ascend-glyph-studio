/**
 * Shared machinery for the public-use motif collectors (one script per tradition): polite fetching, the open-licence
 * rule, reading counted grids from images in memory, and the common output (candidates, unreviewed records, review
 * sheet). Each collector supplies its own sources, its own attribution rule and its own output folder.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { extractGrid } from "../../../packages/motif-learner/src/extract.ts";
import { blank, crop, density, parseChart, toChart, toSvg, type Grid } from "../../../packages/motif-learner/src/grid.ts";
import { detectSymmetry } from "../../../packages/motif-learner/src/symmetry.ts";
import type { MotifRecord } from "../../../packages/motif-learner/src/model.ts";

export const MAX_MINUTES = Number(process.env.COLLECT_MAX_MINUTES ?? 150);
export const MAX_IMAGES = Number(process.env.COLLECT_MAX_IMAGES ?? 15000);
const UA_HEADER = "ASCEND-motif-learner/0.1 (https://github.com/admytruk79-netizen/ascend-glyph-studio; provenance-first research)";
const started = Date.now();
export const minutes = () => (Date.now() - started) / 60000;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function get(url: string, asJson = true): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA_HEADER, "AIC-User-Agent": UA_HEADER } });
      if (r.status === 404 || r.status === 410) return null;
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) return null;
      return asJson ? await r.json() : Buffer.from(await r.arrayBuffer());
    } catch (e) { if (i >= 3) throw e; await sleep(2500 * (i + 1)); }
  }
}

export type Licence = "public-domain" | "CC0" | "CC-BY" | "CC-BY-SA";
export function licenceOf(text: string | undefined | null): Licence | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/.test(t)) return null;
  if (/cc0|publicdomain\/zero/.test(t)) return "CC0";
  if (/public domain|publicdomain|\bpd\b|pd-|\bpdm\b/.test(t)) return "public-domain";
  if (/by-sa|by sa|sharealike|share-alike/.test(t)) return "CC-BY-SA";
  if (/cc[- ]by|creativecommons\.org\/licenses\/by\//.test(t)) return "CC-BY";
  return null;
}

export interface Candidate { id: string; source: string; title: string; pageUrl: string; imageUrl: string; licenceText: string; evidence: string | null; group: string; note?: string }
export function collector() {
  const candidates = new Map<string, Candidate>();
  return { candidates, add: (c: Candidate) => { if (c.imageUrl && !candidates.has(c.id)) candidates.set(c.id, c); } };
}
export const series = (title: string) => title.replace(/\.(jpe?g|png|tiff?|gif|webp)$/i, "").replace(/[\s_\-.(]*\(?\d+[a-z]?\)?$/i, "").trim().toLowerCase();

// ---------- reading ----------
/**
 * Separate motifs on one image: clusters of stitches more than `gap` empty cells apart, each at least min×min.
 * `complete` is false when a motif touches the edge of the area read (it runs off the photograph or the crop).
 */
export function splitMotifs(g: Grid, gap = 2, min = 5): { grid: Grid; complete: boolean }[] {
  const label = new Int32Array(g.cells.length).fill(-1), out: { grid: Grid; complete: boolean }[] = [];
  for (let i = 0; i < g.cells.length; i++) {
    if (!g.cells[i] || label[i] >= 0) continue;
    const id = out.length, stack = [i], members: number[] = []; label[i] = id;
    while (stack.length) {
      const j = stack.pop()!, x = j % g.w, y = (j - x) / g.w; members.push(j);
      for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
        const nx = x + dx, ny = y + dy, k = ny * g.w + nx;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[k] && label[k] < 0) { label[k] = id; stack.push(k); }
      }
    }
    const part = blank(g.w, g.h); members.forEach((j) => (part.cells[j] = g.cells[j]!));
    const xs = members.map((j) => j % g.w), ys = members.map((j) => Math.floor(j / g.w));
    const complete = Math.min(...xs) > 0 && Math.min(...ys) > 0 && Math.max(...xs) < g.w - 1 && Math.max(...ys) < g.h - 1;
    out.push({ grid: crop(part), complete });
  }
  return out.filter(({ grid: m }) => m.w >= min && m.h >= min && m.w <= 120 && m.h <= 120 && density(m) > 0.05 && density(m) < 0.9);
}

export async function readImage(url: string) {
  const buf: Buffer | null = await get(url, false);
  if (!buf) throw new Error("image unavailable");
  const meta = await sharp(buf).metadata(), W = meta.width ?? 0, H = meta.height ?? 0;
  let best: { motifs: { grid: Grid; complete: boolean }[]; confidence: number; separation: number; quality: number; pitch: [number, number]; crop: string } | null = null;
  for (const frac of [1, 0.6, 0.35]) for (const work of [1000, 1800]) {
    const cw = Math.round(W * frac), ch = Math.round(H * frac);
    if (cw < 64 || ch < 64) continue;
    const { data, info } = await sharp(buf).extract({ left: (W - cw) >> 1, top: (H - ch) >> 1, width: cw, height: ch }).resize({ width: Math.min(work, cw), withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const got = extractGrid({ width: info.width, height: info.height, data, channels: 3 }, { minConfidence: 0.35 });
    if (!got) continue;
    // the largest motifs first, at most 12 per image (a plate rarely holds more; more usually means noise)
    const motifs = splitMotifs(got.grid).sort((a, b) => b.grid.w * b.grid.h - a.grid.w * a.grid.h).slice(0, 12);
    const quality = got.confidence * Math.min(1, got.separation / 2);
    if (motifs.length && (!best || quality > best.quality)) best = { motifs, confidence: got.confidence, separation: got.separation, quality, pitch: got.pitch, crop: `centre ${Math.round(frac * 100)}% at ${info.width}px` };
  }
  return best;
}

export type Row = Candidate & { licence: Licence | null; status: string; flags: string[]; motifs?: number; confidence?: number; separation?: number; quality?: number };
export interface Finish {
  out: string;
  tradition: string;
  /** Tradition-specific flags for a person to decide on (shared traditions, places now elsewhere …). */
  flags?: (c: Candidate) => string[];
  /** Status for a candidate the reader should skip, or null to read it. Licence and attribution are checked first. */
  skip?: (r: Row) => string | null;
  /** What a record's note calls the attribution, e.g. "Ukrainian evidence". */
  evidenceLabel: string;
  noAttributionStatus: string;
}

/** Licence and attribution checks, reading, and the common output files (COLLECT_OUT overrides the folder). */
export async function finish(candidates: Map<string, Candidate>, o: Finish) {
  console.log(`candidates: ${candidates.size}`);
  const rows: Row[] = [...candidates.values()].map((c) => {
    const flags = o.flags?.(c) ?? [];
    if (/in the us/i.test(c.licenceText)) flags.push("public-domain-in-us-only");
    return { ...c, licence: licenceOf(c.licenceText), status: "", flags };
  });
  const todo = rows.filter((r) => {
    if (!r.licence) return !(r.status = "licence-not-public-use");
    if (!r.evidence) return !(r.status = o.noAttributionStatus);
    const s = o.skip?.(r);
    return s ? !(r.status = s) : true;
  });
  console.log(`to read: ${todo.length}`);

  const records: (MotifRecord & { quality: number; complete: boolean })[] = [];
  let next = 0;
  const worker = async () => {
    while (next < todo.length && minutes() < MAX_MINUTES) {
      const r = todo[next++]!;
      try {
        const read = await readImage(r.imageUrl);
        if (!read) { r.status = "no-counted-grid-read"; continue; }
        r.status = "grid-read"; r.motifs = read.motifs.length; r.confidence = +read.confidence.toFixed(3); r.separation = +read.separation.toFixed(2); r.quality = +read.quality.toFixed(3);
        read.motifs.forEach(({ grid: g, complete }, k) => {
          const id = read.motifs.length > 1 ? `${r.id}-m${k + 1}` : r.id;
          records.push({
            id, quality: +read.quality.toFixed(3), complete, name: r.title.slice(0, 120), tradition: o.tradition, region: null, technique: "unverified-counted", sourceGroup: r.group, chart: toChart(g),
            provenance: { kind: r.source === "ia" ? "pattern-book" : "museum-object", licence: r.licence!, culturalAccess: "review", independentSource: true, url: r.pageUrl,
              note: `${r.source}; ${r.licenceText.slice(0, 80)}; ${o.evidenceLabel} (${r.evidence}); ${r.flags.length ? `FLAGS: ${r.flags.join(", ")}; ` : ""}grid read automatically (${read.crop}, pitch ${read.pitch.join("×")} px, confidence ${read.confidence.toFixed(2)}, colour separation ${read.separation.toFixed(2)}, ${complete ? "complete" : "CUT OFF at the edge of the image"}, symmetry ${detectSymmetry(g)}${read.motifs.length > 1 ? `, motif ${k + 1} of ${read.motifs.length}` : ""}). Check against the image, set technique and documented region, then set culturalAccess to open.` },
          });
        });
      } catch (e) { r.status = `image-error: ${String(e).slice(0, 80)}`; }
    }
  };
  await Promise.all([1, 2, 3, 4].map(worker));
  for (const r of todo) if (!r.status) r.status = "not-reached-time-budget";

  const OUT = process.env.COLLECT_OUT ?? o.out;
  mkdirSync(OUT, { recursive: true });
  const count = (k: (r: Row) => string) => rows.reduce<Record<string, number>>((m, r) => { const v = k(r); m[v] = (m[v] ?? 0) + 1; return m; }, {});
  const summary = { tradition: o.tradition, candidates: rows.length, bySource: count((r) => r.source), byStatus: count((r) => r.status.split(":")[0]!), byLicence: count((r) => r.licence ?? "not-public-use"), records: records.length, sourceGroupsWithRecords: new Set(records.map((r) => r.sourceGroup)).size, minutes: +minutes().toFixed(1) };
  writeFileSync(`${OUT}/candidates.json`, JSON.stringify({ schema: "ascend.public-motif-candidates.v1", summary, objects: rows.sort((a, b) => a.id.localeCompare(b.id)) }, null, 1) + "\n");
  records.sort((a, b) => b.quality - a.quality || a.id.localeCompare(b.id));
  writeFileSync(`${OUT}/public-motifs.unreviewed.json`, JSON.stringify({ schema: "ascend.motif-records.v1", records }) + "\n");
  // review sheet: the 300 best reads, best first
  let y = 0; const body: string[] = [];
  for (const rec of records.slice(0, 300)) {
    const w = rec.chart[0]!.length, h = rec.chart.length, cell = Math.max(2, Math.min(6, Math.floor(240 / Math.max(w, h))));
    body.push(`<g transform="translate(0,${y})">${toSvg(parseChart(rec.chart), cell, `${rec.id} · q ${rec.quality} · ${(rec.name ?? "").slice(0, 40)}`)}</g>`); y += h * cell + 24;
  }
  writeFileSync(`${OUT}/review-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${Math.max(20, y)}"><rect width="100%" height="100%" fill="#fff"/>${body.join("")}</svg>\n`);
  console.log(JSON.stringify(summary, null, 1));
  return summary;
}
