/**
 * Diary print pack: covers and an inside page built from the folk bands, each carrying a hidden message in its
 * sprig band (no visible code). Every file is read back with the phone reader's decoder before it is kept.
 *
 *   npx tsx scripts/originals/diary-pack.mts <out-dir> "<message>" [band-id …]
 *
 * Per band: cover-<band>.svg (vector, mm) and cover-<band>.png (300 dpi), A5 148 × 210 mm plus 3 mm bleed.
 * Once: page.svg / page.png, an A5 inside page with light borders and the message down the outer edge.
 * pack.json lists every file, its size and whether the message read back (exit code 2 if any did not).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { Kit } from "../../packages/blend-engine/src/folk-rich.ts";
import { decodeOrnamentScans, layoutOrnamentMessage, ORNAMENT_PALETTE, readColumns } from "../../packages/glyph-codec/src/ornament-message.ts";
import type { DesignObject } from "../../packages/stitch-engine/src/index.ts";
import { bandsFor, H as BAND_H, L as BAND_L, PALETTES } from "./rich-band-defs.ts";

const [out, message, ...only] = process.argv.slice(2) as [string, string, ...string[]];
if (!out || !message) { console.error('usage: diary-pack.mts <out-dir> "<message>" [band-id …]'); process.exit(1); }
mkdirSync(out, { recursive: true });

const C = PALETTES.board, BLEED = 3, TW = 148, TH = 210, W = TW + 2 * BLEED, HH = TH + 2 * BLEED, DPI = 300;
const draw = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const svgDoc = (w: number, h: number, body: string, ground: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${ground}"/>${body}</svg>`;

/**
 * The message band, drawn at the proportions proven on fabric (10 mm sprigs, 34 mm high) and scaled down as a whole
 * so one complete repeat fits `width`: the reader needs a sync star and every sprig after it. Print has no stitch
 * minimums, so scaling keeps every proportion the reader relies on; it reads down to 4 mm sprigs.
 */
function messageBand(width: number) {
  const band = layoutOrnamentMessage(message, { pitch: 10, height: 34 });
  const scale = Math.min(1, width / band.width);
  if (scale < 0.4) throw new Error(`message too long for a ${width} mm band (${band.columns.length} sprigs would be ${(10 * scale).toFixed(1)} mm apart): shorten it`);
  return { objects: band.objects, scale, width: band.width * scale, height: band.height * scale, pitch: +(10 * scale).toFixed(2) };
}

/**
 * Read the band back from the rendered page at two resolutions (a sharp print and a phone-camera-like copy).
 * The band runs down the page, so the crop is turned a quarter left first, as a phone held sideways sees it.
 */
async function verify(svg: string, pageW: number, box: { x: number; y: number; w: number; h: number }) {
  const results: (string | null)[] = [];
  for (const pxPerMm of [DPI / 25.4, 6]) {
    const full = await sharp(Buffer.from(svg), { density: Math.round(pxPerMm * 25.4) }).resize({ width: Math.round(pageW * pxPerMm) }).flatten({ background: "#ffffff" }).removeAlpha().toBuffer();
    const crop = { left: Math.round(box.x * pxPerMm), top: Math.round(box.y * pxPerMm), width: Math.round(box.w * pxPerMm), height: Math.round(box.h * pxPerMm) };
    const img = await sharp(await sharp(full).extract(crop).toBuffer()).rotate(270).raw().toBuffer({ resolveWithObject: true });
    results.push(decodeOrnamentScans([readColumns(img.data, img.info.width, img.info.height)])?.text ?? null);
  }
  const want = message.toLowerCase();
  return { verified: results.every((t) => t === want), decoded: results };
}

/** The message band as a vertical border at x, from y down: its own ground behind it so the reader sees the colours it expects. */
function verticalBand(x: number, y: number) {
  const u = msg.width / msg.scale, v = msg.height / msg.scale;
  const svg = `<g transform="translate(${(x + msg.height).toFixed(2)} ${y.toFixed(2)}) rotate(90) scale(${msg.scale.toFixed(5)})"><rect x="-3" y="-2" width="${u + 6}" height="${v + 4}" fill="${ORNAMENT_PALETTE.ground}"/>${draw(msg.objects)}</g>`;
  return { svg, box: { x, y: y - 1, w: msg.height, h: msg.width + 2 } };
}

const png = (svg: string, wMm: number, file: string) => sharp(Buffer.from(svg), { density: DPI }).resize({ width: Math.round((wMm / 25.4) * DPI) }).flatten({ background: "#ffffff" }).withMetadata({ density: DPI }).png().toFile(file);

const report: Record<string, unknown>[] = [];
const bands = bandsFor(C).filter((b) => !only.length || only.includes(b.id));
const msg = messageBand(TH - 10);

for (const b of bands) {
  // left (spine side): the message border, full height; the folk band, upright, top and bottom across the rest of the width
  const strip = verticalBand(BLEED + 4, (HH - msg.width) / 2), x0 = BLEED + 4 + msg.height + 3, bw = W - x0;
  const k = new Kit(); b.build(k); k.resolveGaps();
  const s = bw / BAND_L, bandH = BAND_H * s;
  const top = `<g transform="translate(${x0.toFixed(2)} 0) scale(${s.toFixed(5)})">${draw(k.objs)}</g>`;
  const bottom = `<g transform="translate(${x0.toFixed(2)} ${(HH - bandH).toFixed(2)}) scale(${s.toFixed(5)})">${draw(k.objs)}</g>`;

  // centre: a medallion (rhomb frame, rose, four stars, kalyna at the corners)
  const m = new Kit("md-"), cx = x0 + bw / 2, cy = HH / 2;
  m.rhombOutline(C.navy, cx, cy, 40, 1.6);
  m.rhombOutline(C.red, cx, cy, 33, 0.9);
  m.rose(cx, cy, 15, { petal: C.red, inner: C.ochre, centre: C.navy, seed: C.ochre });
  for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; m.star8(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 4.2, C.teal, C.ochre, C.red); }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.kalyna(cx + dx * 22, cy + dy * 22, 1.3, C.red);
  m.resolveGaps();

  const svg = svgDoc(W, HH, top + bottom + draw(m.objs) + strip.svg, C.ground);
  const check = await verify(svg, W, strip.box);
  const name = `cover-${b.id}`;
  writeFileSync(`${out}/${name}.svg`, svg);
  await png(svg, W, `${out}/${name}.png`);
  report.push({ file: name, band: b.name, meanings: b.meanings, sizeMm: [W, HH], trimMm: [TW, TH], bleedMm: BLEED, dpi: DPI, messageBandMm: [+msg.width.toFixed(1), +msg.height.toFixed(1)], sprigPitchMm: msg.pitch, ...check });
}

// inside page: thin rhomb borders in a light tint, the message border down the outer edge
{
  const PW = TW, PH = TH, k = new Kit("pg-"), tint = ["#d9b7a6", "#a9b3c4"];
  const strip = verticalBand(PW - 6 - msg.height, (PH - msg.width) / 2);
  for (const y of [8, PH - 8]) for (let i = 0; i < (PW - msg.height - 24) / 5; i++) k.rhomb(tint[i % 2]!, 10 + i * 5, y, 1.3, 1.3, "frame");
  const svg = svgDoc(PW, PH, draw(k.objs) + strip.svg, "#fbf8f1");
  const check = await verify(svg, PW, strip.box);
  writeFileSync(`${out}/page.svg`, svg);
  await png(svg, PW, `${out}/page.png`);
  report.push({ file: "page", sizeMm: [PW, PH], dpi: DPI, messageBandMm: [+msg.width.toFixed(1), +msg.height.toFixed(1)], sprigPitchMm: msg.pitch, ...check });
}

writeFileSync(`${out}/pack.json`, JSON.stringify({ message, files: report }, null, 2));
console.log(JSON.stringify(report.map((r) => ({ file: r.file, verified: r.verified, decoded: r.decoded })), null, 1));
if (report.some((r) => !r.verified)) process.exitCode = 2;
