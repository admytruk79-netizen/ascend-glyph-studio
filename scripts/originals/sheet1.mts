/** Oleksandr's blue sheet (6 Oct 2026) as an embroidery design. Private: not for the public repo. */
import { writeFileSync } from "node:fs";
import { plan, recipes, runGate, estimateMinutes, writeDst, previewSvg, type DesignObject } from "../../packages/stitch-engine/src/index.ts";
type Pt = { x: number; y: number };
const out = process.argv[2]!;
const variant = process.argv[3] ?? "pencil";
const PAL: Record<string, { ground: string; star: string; seed: string; branch: string; side: string }> = {
  pencil: { ground: "#f3f1ec", star: "#2f86b0", seed: "#4fa3c7", branch: "#2f86b0", side: "#2f86b0" },
  ascend: { ground: "#13131e", star: "#a393c5", seed: "#e0b18e", branch: "#b89569", side: "#cc662b" },
  linen: { ground: "#efe9dc", star: "#3d4088", seed: "#cc662b", branch: "#3d4088", side: "#cc662b" },
};
const c = PAL[variant]!;
const objs: DesignObject[] = [];
let n = 0;
const id = (s: string) => `${s}-${n++}`;
const qb = (a: Pt, ctl: Pt, b: Pt, t: number): Pt => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctl.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctl.y + t * t * b.y });

// concave four-point star with seed-flicks around it (the sheet's main motif)
function star(cx: number, cy: number, R: number, tilt: number) {
  const tips = [0, 1, 2, 3].map((k) => { const a = tilt + (k * Math.PI) / 2; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  // four arcs meeting at the points (a single column folds at the cusps)
  for (let k = 0; k < 4; k++) {
    const a = tips[k]!, b = tips[(k + 1) % 4]!, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const ctl = { x: cx + (mid.x - cx) * 0.3, y: cy + (mid.y - cy) * 0.3 };
    objs.push({ kind: "satin", id: id("star"), color: c.star, path: Array.from({ length: 11 }, (_, i) => qb(a, ctl, b, i / 10)), width: 1.3 });
  }
  // eight seed-flicks: small curved leaves pointing outward, between and beyond the tips
  for (let k = 0; k < 8; k++) {
    const a = tilt + Math.PI / 4 + (k * Math.PI) / 4 + (k % 2 ? 0.15 : -0.15);
    const r0 = R * (k % 2 ? 1.25 : 1.05), len = R * 0.55, w = 0.75;
    const base = { x: cx + r0 * Math.cos(a), y: cy + r0 * Math.sin(a) };
    const tipA = a + 0.35, tip = { x: base.x + len * Math.cos(tipA), y: base.y + len * Math.sin(tipA) };
    const nx = -Math.sin(tipA), ny = Math.cos(tipA);
    const leaf: Pt[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8, wv = w * Math.sin(Math.PI * t); leaf.push({ x: base.x + (tip.x - base.x) * t + nx * wv, y: base.y + (tip.y - base.y) * t + ny * wv }); }
    for (let i = 7; i >= 1; i--) { const t = i / 8, wv = w * 0.2 * Math.sin(Math.PI * t); leaf.push({ x: base.x + (tip.x - base.x) * t - nx * wv, y: base.y + (tip.y - base.y) * t - ny * wv }); }
    objs.push({ kind: "fill", id: id("seed"), color: c.seed, polygon: leaf, angle: (tipA * 180) / Math.PI + 90 });
  }
}

// flowing branch: an S-curve stem with curling twigs (between the rows)
function branch(x0: number, x1: number, y: number, amp: number, phase: number, twigSide: number) {
  const stem: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; stem.push({ x: x0 + (x1 - x0) * t, y: y + amp * Math.sin(phase + t * Math.PI * 1.6) }); }
  objs.push({ kind: "satin", id: id("stem"), color: c.branch, path: stem, width: 1.6 });
  for (const t of [0.18, 0.36, 0.55, 0.74, 0.9]) {
    const i = Math.round(t * 40), p = stem[i]!, q = stem[i + 1]!;
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy);
    const side = (Math.round(t * 10) % 2 ? 1 : -1) * twigSide;
    const nx = (-dy / l) * side, ny = (dx / l) * side;
    const twig: Pt[] = [p, { x: p.x + dx / l * 4 + nx * 2.4, y: p.y + dy / l * 4 + ny * 2.4 }, { x: p.x + dx / l * 8 + nx * 3.6, y: p.y + dy / l * 8 + ny * 3.6 }];
    objs.push({ kind: "run", id: id("twig"), color: c.branch, path: twig, triple: true, length: 2 });
  }
}

// side column: small rosette (circle + crossed squares) and small five-point stars
function rosette(cx: number, cy: number, r: number) {
  const ring: Pt[] = Array.from({ length: 25 }, (_, i) => ({ x: cx + r * Math.cos((i / 24) * 2 * Math.PI), y: cy + r * Math.sin((i / 24) * 2 * Math.PI) }));
  objs.push({ kind: "satin", id: id("ring"), color: c.side, path: ring, width: 1.2 });
  for (const off of [0, Math.PI / 4]) {
    const sq = [0, 1, 2, 3, 4].map((k) => ({ x: cx + r * 1.45 * Math.cos(off + (k * Math.PI) / 2), y: cy + r * 1.45 * Math.sin(off + (k * Math.PI) / 2) }));
    objs.push({ kind: "run", id: id("sq"), color: c.side, path: sq, length: 2.2 });
  }
}
function smallStar(cx: number, cy: number, R: number) {
  // solid five-point star (outlined crossing lines would read as a pentagram)
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? R * 0.45 : R; pts.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }); }
  objs.push({ kind: "fill", id: id("pstar"), color: c.side, polygon: pts, angle: 30 });
}

// layout after the sheet: 5 rows of 4 stars, branches between rows, side columns (mm)
const colX = [62, 88, 114, 140], rowY = [24, 58, 92, 124, 160], R = 6.5;
const tilts = [0.05, -0.08, 0.1, -0.04, 0.07];
rowY.forEach((y, r) => colX.forEach((x, k) => star(x, y, R, Math.PI / 4 + tilts[(r + k) % 5]! - Math.PI / 4)));
branch(48, 150, 41, 3.2, 0.2, 1);
branch(46, 152, 75, 3.6, 3.4, -1);
branch(50, 150, 108, 3, 0.8, 1);
branch(52, 148, 142, 3.4, 3.0, -1);
rowY.slice(0, 4).forEach((y) => { rosette(18, y, 3.2); smallStar(32, y + 1, 3); });
smallStar(32, rowY[4]! + 1, 3);
rowY.forEach((y) => smallStar(166, y, 3));

const W = 184, H = 180;
const body = objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : (o as any).triple ? 0.9 : 0.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
writeFileSync(`${out}/sheet1-${variant}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${c.ground}"/>${body}</svg>`);
if (process.env.DBG) { const { shortByType } = await import("./debug-short.mts"); console.log(shortByType(objs)); }
if (variant === "linen") {
  const r = recipes["linen-180-prewashed"]!;
  const p = plan(objs, r);
  const g = runGate(objs, p.commands, r, { hoop: { name: "200x200", width: 200, height: 200 } }, estimateMinutes(p, r.speedSpm));
  writeFileSync(`${out}/sheet1.dst`, writeDst(p.commands, { label: "OLEKSANDR-S1" }));
  writeFileSync(`${out}/sheet1-stitches.svg`, previewSvg(p.commands, p.colors));
  console.log(JSON.stringify({ objects: objs.length, stitches: p.commands.filter((x) => x.cmd === "stitch").length, minutes: +estimateMinutes(p, r.speedSpm).toFixed(1), colors: p.colors.length, failed: g.checks.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) }));
}
