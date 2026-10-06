/**
 * Generate candidates for the owner's focus requests, render them, and score each with CLIP:
 *  - resemblance to each tradition centroid of the corpus (structure-only traditions included: CLIP
 *    sees structure and texture, not names);
 *  - text alignment with plain descriptions of each requested tradition, and with "generic clip-art";
 *  - novelty: the nearest single corpus object (too close → rejected as a near-copy).
 * Writes out/candidate-scores.json, out/candidates/*.png, and inserts rows into Neon (design_candidate).
 * Env: REF_IN, DATABASE_URL (optional).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import sharp from "sharp";
import { generate, toSvg, type Request } from "../../packages/blend-engine/src/generate.ts";
import { feasibility, readBackGroup } from "../../packages/blend-engine/src/check.ts";
import { cos, embedImage, embedTexts, fromB64, MODEL } from "./clip.mts";

const TOO_CLOSE = 0.95;
const ref = JSON.parse(gunzipSync(readFileSync(process.env.REF_IN ?? "out/clip-reference.json.gz")).toString());
const centroids = Object.fromEntries(Object.entries<any>(ref.traditions).map(([t, v]) => [t, fromB64(v.centroid)]));
const items = (ref.items as any[]).map((x) => ({ ...x, v: fromB64(x.e) }));

const PROMPTS: Record<string, string> = {
  Ukrainian: "a Ukrainian folk embroidery ornament band, red and black geometric cross-stitch on linen",
  "Western / cowboy material culture": "cowboy boot stitching and western leather tooling ornament",
  "Native American (structure only)": "Native American geometric beadwork pattern",
  Belarusian: "a Belarusian red woven towel ornament",
  Lithuanian: "a Lithuanian woven sash pattern",
  "English (16th–19th c.)": "an English 17th century needlework sampler border",
  generic: "generic modern clip-art vector pattern",
};
const texts = await embedTexts(Object.values(PROMPTS));
const textOf = Object.fromEntries(Object.keys(PROMPTS).map((k, i) => [k, texts[i]!]));

const focus = { Ukrainian: 50, "Western / cowboy material culture": 25, "Native American (structure only)": 15 };
const zone = { name: "linen shirt cuff band", finishedLength: 250, height: 30, seamAllowance: 10, closureOverlap: 18 };
const requests: Request[] = [
  { weights: focus, meanings: ["protection", "family", "ascent"], zone, seed: 11 },
  { weights: focus, meanings: ["sun", "fertility"], zone, seed: 12 },
  { weights: { Ukrainian: 80, "Western / cowboy material culture": 20 }, meanings: ["protection", "road"], zone, seed: 13 },
  { weights: { "Western / cowboy material culture": 60, "Native American (structure only)": 40 }, meanings: ["growth", "light"], zone, seed: 14 },
];
const batch = `score-${new Date().toISOString().slice(0, 16)}`;
mkdirSync("out/candidates", { recursive: true });
const rows: any[] = [];
for (const req of requests) {
  for (const c of generate(req, 6)) {
    const svg = toSvg(c, req.zone.height);
    const png = await sharp(Buffer.from(svg), { density: 200 }).resize({ width: 1024 }).flatten({ background: "#efe9dc" }).png().toBuffer();
    writeFileSync(`out/candidates/${c.id}.png`, png);
    const e = await embedImage(png);
    const resemblance = Object.fromEntries(Object.entries(centroids).map(([t, v]) => [t, +cos(e, v).toFixed(4)]));
    const logits = Object.fromEntries(Object.entries(textOf).map(([k, v]) => [k, cos(e, v) * 100]));
    const z = Object.values(logits).reduce((a, b) => a + Math.exp(b), 0);
    const text = Object.fromEntries(Object.entries(logits).map(([k, v]) => [k, +(Math.exp(v) / z).toFixed(4)]));
    let nearest = { id: "", tradition: "", url: "", sim: -1 };
    for (const it of items) { const s = cos(e, it.v); if (s > nearest.sim) nearest = { id: it.id, tradition: it.tradition, url: it.url, sim: s }; }
    const wsum = Object.values(req.weights).reduce((a, b) => a + b, 0);
    const blendFit = Object.entries(req.weights).reduce((a, [t, w]) => a + (resemblance[t] ?? 0) * (w / wsum), 0);
    const textFit = Object.entries(req.weights).reduce((a, [t, w]) => a + (text[t] ?? 0) * (w / wsum), 0);
    const f = feasibility(c);
    const gateFailures = f.gate.checks.filter((x) => !x.pass && x.id !== "recipe-validated").map((x) => x.id);
    const tooClose = nearest.sim >= TOO_CLOSE;
    const score = +(blendFit + 0.5 * textFit - 0.5 * (text.generic ?? 0) - (tooClose ? 1 : 0) - (gateFailures.length ? 1 : 0)).toFixed(4);
    const scores = { model: MODEL, blendFit: +blendFit.toFixed(4), textFit: +textFit.toFixed(4), generic: text.generic, resemblance, text, nearest: { ...nearest, sim: +nearest.sim.toFixed(4) }, tooClose, readBack: readBackGroup(c, req.zone.height).group, score };
    rows.push({ id: `${batch}-${c.id}`, batch, request: { weights: req.weights, meanings: req.meanings, zone: req.zone.name }, lineage: c.lineage, svg, group: c.group, motif: c.motif.id, scores, gateFailures });
  }
}
rows.sort((a, b) => b.scores.score - a.scores.score);
writeFileSync("out/candidate-scores.json", JSON.stringify({ batch, reference: Object.fromEntries(Object.entries<any>(ref.traditions).map(([t, v]) => [t, v.n])), rows: rows.map(({ svg, ...r }) => r) }, null, 2));
console.log(`SCORES batch=${batch} reference=${JSON.stringify(Object.fromEntries(Object.entries<any>(ref.traditions).map(([t, v]) => [t, v.n])))}`);
for (const r of rows) console.log(`${r.scores.score.toFixed(3)} ${r.id.slice(-10)} ${r.group}/${r.motif} blend=${r.scores.blendFit} text=${r.scores.textFit} generic=${r.scores.generic} nearest=${r.scores.nearest.sim} ${r.scores.nearest.tradition} ${r.scores.tooClose ? "TOO-CLOSE" : ""} ${r.gateFailures.join(",")}`);

if (process.env.DATABASE_URL) {
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  for (const r of rows)
    await pool.query("insert into design_candidate(id,batch,request,lineage,svg,frieze_group,motif,scores,gate_failures) values($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8::jsonb,$9) on conflict(id) do nothing",
      [r.id, r.batch, JSON.stringify(r.request), JSON.stringify(r.lineage), r.svg, r.group, r.motif, JSON.stringify(r.scores), r.gateFailures]);
  for (const [t, v] of Object.entries<any>(ref.traditions))
    await pool.query("insert into style_embedding(tradition,model,built_at,n,centroid) values($1,$2,$3,$4,$5) on conflict do nothing", [t, ref.model, ref.builtAt, v.n, Array.from(fromB64(v.centroid))]);
  await pool.end();
  console.log(`NEON inserted ${rows.length} candidates`);
}
