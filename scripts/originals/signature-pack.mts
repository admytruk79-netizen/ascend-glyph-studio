/**
 * Oleksandr's signature style as stitch files: a panel (yoke, placket, diary cover, boot shaft) and a band (cuff, hem).
 *
 *   npx tsx scripts/originals/signature-pack.mts [out-dir=originals/designs/signature-01] [panel WxH=130x200] [band LxH=250x60]
 *
 * Writes <piece>.svg, <piece>.dst, <piece>-stitches.svg, board.png and pack.json (stitches, minutes, gate).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { SIGNATURE, signatureBand, signaturePanel } from "../../packages/blend-engine/src/signature-style.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const out = process.argv[2] ?? "originals/designs/signature-01";
const [pw, ph] = (process.argv[3] ?? "130x200").split("x").map(Number) as [number, number];
const [bl, bh] = (process.argv[4] ?? "250x60").split("x").map(Number) as [number, number];
mkdirSync(out, { recursive: true });
const draw = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const r = recipes["linen-180-prewashed"]!, report: Record<string, unknown> = {};
const pieces = [["panel", signaturePanel(pw, ph), pw, ph], ["band", signatureBand(bl, bh), bl, bh]] as const;
for (const [name, kit, w, h] of pieces) {
  writeFileSync(`${out}/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${SIGNATURE.ground}"/>${draw(kit.objs)}</svg>`);
  const p = plan(kit.objs, r), min = estimateMinutes(p, r.speedSpm);
  const failed = runGate(kit.objs, p.commands, r, { hoop: { name: "frame 360x360", width: 360, height: 360 } }, min).checks.filter((c) => !c.pass && c.id !== "recipe-validated").map((c) => `${c.id}: ${c.detail}`);
  writeFileSync(`${out}/${name}.dst`, writeDst(p.commands, { label: `ASCEND-${name.toUpperCase()}` }));
  writeFileSync(`${out}/${name}-stitches.svg`, previewSvg(p.commands, p.colors));
  report[name] = { sizeMm: [w, h], objects: kit.objs.length, stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length, gateFailed: failed };
}
const W = pw + 10 + bl, H = Math.max(ph, bh);
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 6}" height="${H * 6}"><rect width="100%" height="100%" fill="#fff"/><rect width="${pw}" height="${ph}" fill="${SIGNATURE.ground}"/>${draw(pieces[0][1].objs)}<g transform="translate(${pw + 10} 0)"><rect width="${bl}" height="${bh}" fill="${SIGNATURE.ground}"/>${draw(pieces[1][1].objs)}</g></svg>`)).png().toFile(`${out}/board.png`);
writeFileSync(`${out}/pack.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
