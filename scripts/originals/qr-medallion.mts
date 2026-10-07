/**
 * QR rhomb medallion: a standard QR code (any phone camera reads it) embroidered as a Ukrainian rhomb.
 *
 *   npx tsx scripts/originals/qr-medallion.mts <out-dir> [message] [module-mm]
 *
 * - The QR grid turned 45° becomes the rhomb, the central form of the ornament ("seeded field"); its
 *   three finder "eyes" sit at three corners. Error correction level H (≈30% recoverable) leaves the
 *   heart free for the ASCEND star.
 * - Dark modules are stitched as tatami fills, merged along each row so neighbours join without gaps.
 * - A light quiet zone (4 modules) keeps the code readable; outside it an ornament frame: rhomb border,
 *   kalyna and sprigs along the sides, ASCEND stars at the tips.
 * - Verified by decoding: the design SVG and the stitch preview (what the machine will sew) are both
 *   rasterised and read with jsQR, rotated as worn.
 */
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";
import { Kit, type Pt } from "../../packages/blend-engine/src/folk-rich.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const out = process.argv[2]!;
const message = process.argv[3] ?? "https://ascend-glyph-studio.onrender.com/s/1";
const M = Number(process.argv[4] ?? 2.6); // module size, mm
const C = { ground: "#efe9dc", ink: "#0e0e4b", star: "#cc662b", seed: "#b89569", frame: "#3d4088", berry: "#b3332b", leaf: "#4f6b3a" };

const qr = QRCode.create(message, { errorCorrectionLevel: "H" });
const N = qr.modules.size, dark = (r: number, c: number) => !!qr.modules.get(r, c);
// the heart: a small square left free for the star (well inside the 30% H budget)
const heart = N >= 33 ? 3 : 2, mid = (N - 1) / 2;
const inHeart = (r: number, c: number) => Math.abs(r - mid) <= heart && Math.abs(c - mid) <= heart;

const QUIET = 4, side = (N + 2 * QUIET) * M;          // quiet square side before rotation
const R = (side / Math.SQRT2) + 0.5;                    // half-diagonal of the rotated quiet square
const FRAME = 16;                                       // ornament frame width outside the quiet zone, mm
const S = 2 * (R + FRAME + 2);                          // canvas
const cx = S / 2, cy = S / 2;
// module (r, c) corner → canvas, rotated 45° about the centre
const rot = (x: number, y: number): Pt => { const dx = x - (N * M) / 2, dy = y - (N * M) / 2; return { x: cx + (dx - dy) / Math.SQRT2, y: cy + (dx + dy) / Math.SQRT2 }; };

const k = new Kit("qr-");
// dark modules: one filled rectangle per run of dark modules in a row (rows touch, so no gaps)
for (let r = 0; r < N; r++) {
  let c = 0;
  while (c < N) {
    if (!dark(r, c) || inHeart(r, c)) { c++; continue; }
    let e = c; while (e + 1 < N && dark(r, e + 1) && !inHeart(r, e + 1)) e++;
    // overlap neighbouring rows and runs by 0.3 mm so the thread forms continuous dark blocks (fills stop
    // slightly short of their outline; without overlap pale lines appear between rows and break the modules)
    const o = 0.3, x0 = c * M - (c > 0 && dark(r, c - 1) ? o : 0), x1 = (e + 1) * M + o * 0, y0 = r * M - (r > 0 && dark(r - 1, c) ? o : 0), y1 = (r + 1) * M + (r + 1 < N && dark(r + 1, c) ? o : 0);
    k.fill("module", C.ink, [rot(x0, y0), rot(x1, y0), rot(x1, y1), rot(x0, y1)], 45);
    c = e + 1;
  }
}
// the heart: ASCEND star
k.ascendStar(cx, cy, heart * M * 0.9, C.star, C.seed, Math.PI / 4);
// frame: rhomb border just outside the quiet zone, a second one further out
const tip = (d: number) => [{ x: cx, y: cy - d }, { x: cx + d, y: cy }, { x: cx, y: cy + d }, { x: cx - d, y: cy }];
for (const [d, w, col] of [[R + 1.5, 1.6, C.frame], [R + FRAME, 1.4, C.frame]] as const) { const v = tip(d); for (let q = 0; q < 4; q++) k.satin("frame", col, [v[q]!, v[(q + 1) % 4]!], w); }
// along each side: alternating kalyna clusters and sprigs pointing outward; ASCEND stars at the four tips
const mid0 = R + 1.5 + (FRAME - 1.5) / 2;
for (let q = 0; q < 4; q++) {
  const a = tip(mid0)[q]!, b = tip(mid0)[(q + 1) % 4]!, out = Math.atan2((a.y + b.y) / 2 - cy, (a.x + b.x) / 2 - cx);
  const n = Math.max(3, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 13));
  for (let i = 1; i < n; i++) {
    const t = i / n, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (i % 2) k.kalyna(p.x, p.y, 1.15, C.berry);
    else { k.leaf(C.leaf, { x: p.x - Math.cos(out) * 4, y: p.y - Math.sin(out) * 4 }, out - 0.5, 7.5, 1.6); k.leaf(C.leaf, { x: p.x - Math.cos(out) * 4, y: p.y - Math.sin(out) * 4 }, out + 0.5, 7.5, 1.6); }
  }
  const tp = tip(mid0)[q]!; k.ascendStar(tp.x, tp.y, 4.2, C.star, C.seed, Math.PI / 4);
}
k.resolveGaps(0.9, 12);

const objs = k.objs;
const svgOf = (o: DesignObject[]) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S.toFixed(1)}mm" height="${S.toFixed(1)}mm" viewBox="0 0 ${S.toFixed(2)} ${S.toFixed(2)}"><rect width="100%" height="100%" fill="${C.ground}"/>` + o.map((x) => x.kind === "fill" ? `<polygon points="${x.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${x.color}"/>`
  : `<polyline points="${x.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${x.color}" stroke-width="${x.kind === "satin" ? x.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("") + "</svg>";
const svg = svgOf(objs);
writeFileSync(`${out}/qr-medallion.svg`, svg);
const r = recipes["linen-180-prewashed"]!, p = plan(objs, r), min = estimateMinutes(p, r.speedSpm);
const g = runGate(objs, p.commands, r, { hoop: { name: "200x200", width: 200, height: 200 } }, min);
writeFileSync(`${out}/qr-medallion.dst`, writeDst(p.commands, { label: "ASCEND-QR" }));
const stitches = previewSvg(p.commands, p.colors, { thread: 0.45 });
writeFileSync(`${out}/qr-medallion-stitches.svg`, stitches);

// verification: decode what we drew and what the machine will sew, upright and as worn (rotated)
async function decode(svgText: string, angle: number, px = 900, ground = C.ground): Promise<string | null> {
  const img = await sharp(Buffer.from(svgText), { density: 200 }).resize(px, px, { fit: "contain", background: ground }).rotate(angle, { background: ground }).flatten({ background: ground }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.info.width, img.info.height)?.data ?? null;
}
const checks: Record<string, string | null> = {};
for (const [name, s] of [["design", svg], ["stitches", stitches.replace(/<svg([^>]*)>/, `<svg$1><rect width="100%" height="100%" fill="${C.ground}"/>`)]] as const)
  for (const a of [0, 45, 10]) checks[`${name}@${a}°`] = await decode(s, a);
const ok = Object.values(checks).every((v) => v === message);
console.log(JSON.stringify({ message, qrVersion: qr.version, modules: N, moduleMm: M, sizeMm: +S.toFixed(1), objects: objs.length, stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length, gateFailed: g.checks.filter((c) => !c.pass).map((c) => c.id), decoded: checks, verified: ok }, null, 1));
if (!ok) process.exitCode = 2;
