/**
 * Bulk research-corpus acquisition. Target scale: 250,000+ accepted instances.
 * Streams paginated open-access museum APIs; never hand-curates individual objects.
 *
 * Stage covered here: discover → enumerate candidate records → metadata gates
 * (image present, provenance, rights, cultural access, structural relevance)
 * → deduplicate. Records written to CORPUS_OUT are *metadata-accepted
 * candidates*; they count toward a milestone only after image analysis.
 *
 * Env: CORPUS_TARGET (default 250000), CORPUS_OUT, CORPUS_REVIEW_OUT,
 * CORPUS_SUMMARY_OUT, CORPUS_MAX_SOURCE_SHARE (default 0.4),
 * CORPUS_MAX_MINUTES (default 330), CORPUS_CHECKPOINT_EVERY (default 1000),
 * CORPUS_SOURCES (comma list to restrict), SMITHSONIAN_API_KEY (optional).
 */
import { createWriteStream, writeFileSync } from "node:fs";
import { dedupeKeys, gate, type Candidate } from "./corpus/gates.ts";
import { ADAPTERS, QUERIES, USER_AGENT, type Adapter, type FetchJson, type Query } from "./corpus/sources.ts";

const target = Number(process.env.CORPUS_TARGET ?? 250000);
const out = process.env.CORPUS_OUT ?? "data/research/corpus.ndjson";
const reviewOut = process.env.CORPUS_REVIEW_OUT ?? "data/research/corpus-review.ndjson";
const summaryOut = process.env.CORPUS_SUMMARY_OUT ?? "data/research/corpus-summary.json";
const maxShare = Number(process.env.CORPUS_MAX_SOURCE_SHARE ?? 0.4);
const deadline = Date.now() + Number(process.env.CORPUS_MAX_MINUTES ?? 330) * 60_000;
const checkpointEvery = Number(process.env.CORPUS_CHECKPOINT_EVERY ?? 1000);
const only = process.env.CORPUS_SOURCES?.split(",").map((s) => s.trim()).filter(Boolean);
const WORKERS: Record<string, number> = { met: 6, aic: 2, cma: 2, vam: 2, si: 2 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fetchJson: FetchJson = async (url, headers = {}) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json", ...headers }, signal: AbortSignal.timeout(30_000) });
      if (r.ok) return r.json();
      if (r.status === 404) return null;
      if (attempt < 3 && (r.status === 429 || r.status >= 500)) { await sleep(2000 * 2 ** attempt); continue; }
      throw new Error(`${r.status} ${url}`);
    } catch (e) {
      if (attempt < 3 && (e as Error).name === "TimeoutError") { await sleep(2000 * 2 ** attempt); continue; }
      throw e;
    }
  }
};

const seen = new Set<string>();
const stats = {
  target, accepted: 0, enumerated: 0, duplicates: 0,
  bySource: {} as Record<string, { enumerated: number; accepted: number; review: number; rejected: number; errors: number }>,
  rejected: {} as Record<string, number>,
  relevance: {} as Record<string, number>,
  queryGroup: {} as Record<string, number>,
  culture: {} as Record<string, number>,
  startedAt: new Date().toISOString(), finishedAt: "", stopReason: "",
};
const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

function row(c: Candidate, relevance: string[]) {
  return {
    id: c.id, source: c.source, tradition: c.culture ?? c.region ?? "unattributed", culturalAccess: "open",
    title: c.title, creator: c.creator, date: c.date, region: c.region, material: c.material, technique: c.technique,
    objectURL: c.objectURL, image: c.image, rights: c.rights, accession: c.accession, reliability: c.reliability,
    raw: { institution: c.institution, query: c.query, queryGroup: c.tradition, culture: c.culture, objectType: c.objectType,
      rightsStatus: c.rightsStatus, imageWidth: c.imageWidth, imageHeight: c.imageHeight, relevance, stage: "metadata-accepted" },
  };
}

async function main() {
  const stream = createWriteStream(out, { flags: "w" });
  const review = createWriteStream(reviewOut, { flags: "w" });
  const adapters = ADAPTERS.filter((a) => a.enabled() && (!only || only.includes(a.source)));
  const sourceCap = Math.ceil(target * Math.max(maxShare, 1 / adapters.length));
  let stop = false;

  const accept = (a: Adapter, c: Candidate) => {
    const s = stats.bySource[a.source];
    stats.enumerated++; s.enumerated++;
    const keys = dedupeKeys(c);
    if (keys.some((k) => seen.has(k))) { stats.duplicates++; return; }
    keys.forEach((k) => seen.add(k));
    const g = gate(c);
    if (!g.accepted) {
      bump(stats.rejected, g.reason); s.rejected++;
      if (g.reason === "cultural-review" || g.reason === "rights-unresolved") {
        s.review++;
        review.write(JSON.stringify({ id: c.id, institution: c.institution, objectURL: c.objectURL, accession: c.accession,
          title: c.title, culture: c.culture, region: c.region, rights: c.rights, reason: g.reason, culturalAccess: g.culturalAccess }) + "\n");
      }
      return;
    }
    if (stats.accepted >= target || s.accepted >= sourceCap) return;
    stream.write(JSON.stringify(row(c, g.relevance)) + "\n");
    stats.accepted++; s.accepted++;
    g.relevance.forEach((r) => bump(stats.relevance, r));
    bump(stats.queryGroup, c.tradition ?? "Global");
    if (c.culture) bump(stats.culture, c.culture);
    if (stats.accepted % checkpointEvery === 0) console.log(JSON.stringify({ checkpoint: stats.accepted, target, out, enumerated: stats.enumerated }));
    if (stats.accepted >= target) { stop = true; stats.stopReason = "target reached"; }
  };

  await Promise.all(adapters.map(async (a) => {
    stats.bySource[a.source] = { enumerated: 0, accepted: 0, review: 0, rejected: 0, errors: 0 };
    const queue: Query[] = [...QUERIES];
    const perQuery = Math.max(100, Math.ceil((sourceCap / QUERIES.length) * 3));
    const worker = async () => {
      for (let q = queue.shift(); q && !stop; q = queue.shift()) {
        let fromQuery = 0;
        try {
          for await (const c of a.search(q, fetchJson)) {
            if (stop || Date.now() > deadline || stats.bySource[a.source].accepted >= sourceCap) break;
            const before = stats.bySource[a.source].accepted;
            accept(a, c);
            if (stats.bySource[a.source].accepted > before && ++fromQuery >= perQuery) break;
          }
        } catch (e) {
          stats.bySource[a.source].errors++;
          console.error(JSON.stringify({ source: a.source, query: q.q, error: String((e as Error).message ?? e).slice(0, 200) }));
        }
        if (Date.now() > deadline) { stop = true; stats.stopReason ||= "time budget reached"; }
      }
    };
    await Promise.all(Array.from({ length: WORKERS[a.source] ?? 2 }, worker));
  }));

  stats.stopReason ||= "all queries exhausted";
  stats.finishedAt = new Date().toISOString();
  await Promise.all([new Promise((r) => stream.end(r)), new Promise((r) => review.end(r))]);
  const unique = stats.enumerated - stats.duplicates;
  writeFileSync(summaryOut, JSON.stringify({ ...stats, unique, out, reviewOut }, null, 2));
  console.log(JSON.stringify({ written: stats.accepted, target, out, unique, stopReason: stats.stopReason }));
  console.log("SUMMARY " + JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
