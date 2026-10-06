/**
 * Reference set for scoring: sample up to REF_PER_TRADITION analysed objects per tradition from the
 * master corpus (tradition from catalogue text, scripts/corpus/profiles.ts), download each image once,
 * embed it with CLIP and keep the embeddings + per-tradition centroids. Images are not stored.
 * Env: MASTER_IN, REF_OUT (json.gz), REF_PER_TRADITION (default 250), REF_MAX_MINUTES (default 60).
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip, gzipSync } from "node:zlib";
import { createInterface } from "node:readline";
import { traditionOf } from "../corpus/profiles.ts";
import { USER_AGENT } from "../corpus/sources.ts";
import { centroid, embedImage, MODEL, toB64 } from "./clip.mts";

const per = Number(process.env.REF_PER_TRADITION ?? 250);
const deadline = Date.now() + Number(process.env.REF_MAX_MINUTES ?? 60) * 60_000;
const groups = new Map<string, any[]>();
const stream = createReadStream(process.env.MASTER_IN ?? "master/master.ndjson.gz");
for await (const line of createInterface({ input: stream.pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  if (!r.image) continue;
  const t = traditionOf(r).replace(/ \(by query\)$/, "");
  if (t === "Other" || t === "Unlabelled") continue;
  const g = groups.get(t) ?? groups.set(t, []).get(t)!;
  // reservoir-like spread: keep every k-th once full so the sample spans sources
  if (g.length < per * 3) g.push(r);
}
const lastHit = new Map<string, number>();
async function get(url: string): Promise<Uint8Array> {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + 400 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  const h: Record<string, string> = { "user-agent": USER_AGENT, accept: "image/jpeg,image/png,image/*;q=0.8" };
  if (url.includes("artic.edu")) h["AIC-User-Agent"] = USER_AGENT;
  const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(String(res.status));
  return new Uint8Array(await res.arrayBuffer());
}
const out: { traditions: Record<string, { n: number; centroid: string }>; items: { id: string; tradition: string; url?: string; e: string }[]; model: string; builtAt: string } =
  { traditions: {}, items: [], model: MODEL, builtAt: new Date().toISOString() };
for (const [t, rows] of groups) {
  const step = Math.max(1, Math.floor(rows.length / per));
  const vs: Float32Array[] = [];
  for (let i = 0; i < rows.length && vs.length < per && Date.now() < deadline; i += step) {
    const r = rows[i];
    try {
      const e = await embedImage(await get(r.image));
      vs.push(e);
      out.items.push({ id: r.id, tradition: t, url: r.objectURL, e: toB64(e) });
    } catch { /* skip unreachable image */ }
  }
  if (vs.length) out.traditions[t] = { n: vs.length, centroid: toB64(centroid(vs)) };
  console.log(`REF ${t}: ${vs.length} embedded (of ${rows.length} sampled)`);
}
writeFileSync(process.env.REF_OUT ?? "out/clip-reference.json.gz", gzipSync(JSON.stringify(out)));
