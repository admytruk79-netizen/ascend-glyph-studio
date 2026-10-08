/**
 * Solid field designs (packages/blend-engine/src/field.ts) as stitch files: panels for a yoke or sleeve and bands for a
 * cuff or hem, several seeds each.
 *
 *   [SEED=field] npx tsx scripts/originals/field-pack.mts [out-dir=originals/designs/field-01] [count=3]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { fieldBand, fieldPanel } from "../../packages/blend-engine/src/field.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const out = process.argv[2] ?? "originals/designs/field-01", count = Number(process.argv[3] ?? 3);
mkdirSync(out, { recursive: true });
const roles = { main: "#b3332b", dark: "#1f2c4c", leaf: "#4f6b3a", light: "#d39b35", accent: "#2b8796" }, ground = "#efe6d2";
const draw = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round"/>`).join("");
const r = recipes["linen-180-prewashed"]!, report: unknown[] = [], tiles: string[] = [];
const seedBase = process.env.SEED ?? "field"; // a new seed per day gives new fields
let x = 0;
for (let i = 0; i < count; i++) for (const [kind, w, h] of [["panel", 130, 200], ["band", 250, 60]] as const) {
  const id = `field-${kind}-${i + 1}`, seed = `${seedBase}-${i}`;
  const made = kind === "panel" ? fieldPanel(w, h, { seed, roles }) : fieldBand(w, h, { seed, roles });
  if (!made) { console.log(id, "not stitchable at this size: skipped"); continue; }
  const { kit, plan: fp } = made;
  writeFileSync(`${out}/${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${ground}"/>${draw(kit.objs)}</svg>`);
  const p = plan(kit.objs, r), min = estimateMinutes(p, r.speedSpm);
  const failed = runGate(kit.objs, p.commands, r, { hoop: { name: "frame 360x360", width: 360, height: 360 } }, min).checks.filter((c) => !c.pass && c.id !== "recipe-validated").map((c) => `${c.id}: ${c.detail}`);
  if (!failed.length) { writeFileSync(`${out}/${id}.dst`, writeDst(p.commands, { label: id.toUpperCase().slice(0, 16) })); writeFileSync(`${out}/${id}-stitches.svg`, previewSvg(p.commands, p.colors)); }
  report.push({ id, sizeMm: [w, h], ...fp, stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length, gateFailed: failed });
  tiles.push(`<g transform="translate(${x} 0)"><rect width="${w}" height="${h}" fill="${ground}"/>${draw(kit.objs)}</g>`); x += w + 8;
  console.log(id, failed.length ? `GATE ${failed.join(" | ")}` : "gate ok");
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 200" width="${x * 3}" height="600"><rect width="100%" height="100%" fill="#fff"/>${tiles.join("")}</svg>`)).png().toFile(`${out}/board.png`);
writeFileSync(`${out}/pack.json`, JSON.stringify(report, null, 2));
