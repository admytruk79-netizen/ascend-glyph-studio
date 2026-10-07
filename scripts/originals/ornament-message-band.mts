/**
 * Message → embroidered band, end to end:
 *
 *   npx tsx scripts/originals/ornament-message-band.mts <out-dir> "<message>" [length-mm]
 *
 * Writes band.svg (design), band.dst (machine file), band-stitches.svg (what the machine sews) and
 * band.json (repeats, stitches, gate, verification). Before it reports success it reads the message back
 * from the stitch preview with the same reader the offline phone page uses. Exit code 2 if it cannot.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { decodeOrnamentScans, layoutOrnamentMessage, ORNAMENT_PALETTE, ornamentMessageSvg, readColumns } from "../../packages/glyph-codec/src/ornament-message.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst } from "../../packages/stitch-engine/src/index.ts";

const [out, message, lengthArg] = process.argv.slice(2) as [string, string, string?];
if (!out || !message) { console.error('usage: ornament-message-band.mts <out-dir> "<message>" [length-mm]'); process.exit(1); }
const band = layoutOrnamentMessage(message, { length: Number(lengthArg ?? 1000) });
const svg = ornamentMessageSvg(band.objects, band.width, band.height);
writeFileSync(`${out}/band.svg`, svg);

const r = recipes["linen-180-prewashed"]!, p = plan(band.objects, r), min = estimateMinutes(p, r.speedSpm);
const g = runGate(band.objects, p.commands, r, { hoop: { name: "border frame 1200x100", width: 1200, height: 100 } }, min);
writeFileSync(`${out}/band.dst`, writeDst(p.commands, { label: "ASCEND-MSG" }));
const stitches = previewSvg(p.commands, p.colors, { thread: 0.45, margin: 0 }).replace(/<svg([^>]*)>/, `<svg$1><rect width="100%" height="100%" fill="${ORNAMENT_PALETTE.ground}"/>`);
writeFileSync(`${out}/band-stitches.svg`, stitches);

// verify on what the machine will sew
const img = await sharp(Buffer.from(stitches), { density: 200 }).resize({ width: Math.round(band.width * 6) }).flatten({ background: ORNAMENT_PALETTE.ground }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const read = decodeOrnamentScans([readColumns(img.data, img.info.width, img.info.height)]);
const verified = read?.text === message.toLowerCase() || read?.text === message;
const report = {
  message, decoded: read?.text ?? null, verified, repeats: +band.repeats.toFixed(2), repeatMm: Math.round(band.width / band.repeats), sizeMm: [band.width, band.height],
  stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length,
  gateFailed: g.checks.filter((c) => !c.pass && c.id !== "recipe-validated").map((c) => `${c.id}: ${c.detail}`),
};
writeFileSync(`${out}/band.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
if (!verified) process.exitCode = 2;
