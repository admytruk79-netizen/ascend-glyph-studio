/**
 * The six named bands from Oleksandr's design board (6 Oct 2026), built from the rich folk vocabulary
 * (packages/blend-engine/src/folk-rich.ts) so they are real, stitchable embroidery.
 *
 *   npx tsx scripts/originals/rich-bands.mts <out-dir> [board|night]
 *
 * Each band is 250 × 60 mm and repeats a whole number of times, so it closes into a ring (hem, cuff, sleeve)
 * with the seam on a unit boundary. Writes <band>.svg, <band>.dst, <band>-stitches.svg, bands.json (lineage + gate).
 */
import { writeFileSync } from "node:fs";
import { Kit } from "../../packages/blend-engine/src/folk-rich.ts";
import { bandsFor, H, L, PALETTES } from "./rich-band-defs.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const out = process.argv[2]!;
const variant = (process.argv[3] ?? "board") as "board" | "night";
const C = PALETTES[variant];
const bands = bandsFor(C);
const r = recipes["linen-180-prewashed"]!;
const toSvg = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const report: unknown[] = [];
for (const b of bands) {
  const k = new Kit(); b.build(k); const fixedGaps = k.resolveGaps();
  writeFileSync(`${out}/${b.id}-${variant}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}"><rect width="100%" height="100%" fill="${C.ground}"/>${toSvg(k.objs)}</svg>`);
  const p = plan(k.objs, r), min = estimateMinutes(p, r.speedSpm);
  const g = runGate(k.objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, min);
  if (variant === "board") { writeFileSync(`${out}/${b.id}.dst`, writeDst(p.commands, { label: b.id.toUpperCase().slice(0, 16) })); writeFileSync(`${out}/${b.id}-stitches.svg`, previewSvg(p.commands, p.colors)); }
  const failed = g.checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`);
  report.push({ id: b.id, name: b.name, meanings: b.meanings, motifs: b.motifs, sizeMm: [L, H], objects: k.objs.length, stitches: p.commands.filter((c) => c.cmd === "stitch").length, colors: p.colors.length, minutes: +min.toFixed(1), failed });
  console.log(b.id, k.objs.length, "obj", fixedGaps, "gaps fixed", p.commands.filter((c) => c.cmd === "stitch").length, "st", min.toFixed(1), "min", failed.join(" | "));
}
writeFileSync(`${out}/bands-${variant}.json`, JSON.stringify(report, null, 2));
