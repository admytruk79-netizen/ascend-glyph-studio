/**
 * New bands from the Lego grammar the trainer learned from the museum corpus.
 *
 *   DATABASE_URL=... npx tsx scripts/originals/lego-bands.mts <out-dir> [scope=all|tradition:<name>|region:<name>] [count=8] [seed=lego]
 *   npx tsx scripts/originals/lego-bands.mts <out-dir> file:<grammar.json> [count] [seed]
 *
 * Reads learned_model 'tesseract-learned-latest' (body.lego) unless a grammar file is given. Writes per band an SVG,
 * a DST and its stitch preview, plus board.png and bands.json (pieces, novel pairings, stitches, gate).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { composeBand, type LegoGrammar } from "../../packages/blend-engine/src/lego-compose.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const [out, scope = "all", countArg = "8", seed = "lego"] = process.argv.slice(2);
if (!out) { console.error("usage: lego-bands.mts <out-dir> [scope] [count] [seed]"); process.exit(1); }
mkdirSync(out, { recursive: true });

async function grammar(): Promise<LegoGrammar> {
  if (scope.startsWith("file:")) return JSON.parse(readFileSync(scope.slice(5), "utf8"));
  const { default: pg } = await import("pg");
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
  const body = (await db.query(`select body from learned_model where id = 'tesseract-learned-latest'`)).rows[0]?.body;
  await db.end();
  const lego = body?.lego;
  if (!lego) throw new Error("the learned model has no Lego grammar yet: run the full training first");
  const [kind, name] = scope.includes(":") ? scope.split(/:(.*)/) : ["all", ""];
  const g = kind === "tradition" ? lego.traditions[name!] : kind === "region" ? lego.regions[name!] : lego.all;
  if (!g) throw new Error(`no grammar for ${scope}`);
  return g;
}

const g = await grammar();
const roles = { main: "#b3332b", dark: "#1f2c4c", leaf: "#4f6b3a", light: "#d39b35", accent: "#2b8796" };
const r = recipes["linen-180-prewashed"]!, L = 250, H = 60;
const svgOf = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const report: unknown[] = [], rows: string[] = [];
for (let i = 0; i < Number(countArg); i++) {
  const id = `lego-${String(i + 1).padStart(2, "0")}`;
  const { kit, plan: bandPlan } = composeBand(g, { seed: `${seed}-${i}`, roles, length: L, height: H });
  const body = svgOf(kit.objs);
  writeFileSync(`${out}/${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}"><rect width="100%" height="100%" fill="#efe6d2"/>${body}</svg>`);
  const p = plan(kit.objs, r), min = estimateMinutes(p, r.speedSpm);
  const failed = runGate(kit.objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, min).checks.filter((c) => !c.pass && c.id !== "recipe-validated").map((c) => `${c.id}: ${c.detail}`);
  if (!failed.length) { writeFileSync(`${out}/${id}.dst`, writeDst(p.commands, { label: id.toUpperCase() })); writeFileSync(`${out}/${id}-stitches.svg`, previewSvg(p.commands, p.colors)); }
  report.push({ id, ...bandPlan, stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length, gateFailed: failed });
  rows.push(`<g transform="translate(0 ${i * (H + 4)})"><rect width="${L}" height="${H}" fill="#efe6d2"/>${body}</g>`);
  console.log(id, bandPlan.hero, "+", bandPlan.companions.join(","), bandPlan.filler ?? "", bandPlan.novelPairs.length ? `new pairing ${bandPlan.novelPairs.join(",")}` : "", failed.length ? `GATE ${failed.join(" | ")}` : "gate ok");
}
const n = Number(countArg), BH = n * (H + 4);
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${BH}" width="${L * 5}" height="${BH * 5}"><rect width="100%" height="100%" fill="#fff"/>${rows.join("")}</svg>`)).png().toFile(`${out}/board.png`);
writeFileSync(`${out}/bands.json`, JSON.stringify({ scope, grammarImages: g.images, bands: report }, null, 2));
