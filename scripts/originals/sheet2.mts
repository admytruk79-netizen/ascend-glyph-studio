/** Oleksandr's coloured sheet (6 Oct 2026) as embroidery. Private: not for the public repo.
 *  mode "drawn": his composition; mode "rich": plus chevron borders, frame and finial from the research. */
import { writeFileSync } from "node:fs";
import { plan, recipes, runGate, estimateMinutes, writeDst, previewSvg, type DesignObject } from "../../packages/stitch-engine/src/index.ts";
type Pt = { x: number; y: number };
const [out, mode = "drawn", ground = "#f4f2ee"] = process.argv.slice(2) as [string, string?, string?];
// his pencils
const BLUE = "#4fb3d9", VIOLET = "#6a4aa8", RED = "#d4563f", GREEN = "#6fa33a", DBLUE = "#2f86b0";
const objs: DesignObject[] = [];
let n = 0;
const id = (s: string) => `${s}-${n++}`;
const P = (cx: number, cy: number, r: number, a: number): Pt => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
const qb = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
function leaf(base: Pt, ang: number, len: number, w: number, color: string, kind = "leaf") {
  const tip = P(base.x, base.y, len, ang), nx = -Math.sin(ang), ny = Math.cos(ang), pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, wv = w * Math.sin(Math.PI * t); pts.push({ x: base.x + (tip.x - base.x) * t + nx * wv, y: base.y + (tip.y - base.y) * t + ny * wv }); }
  for (let i = 7; i >= 1; i--) { const t = i / 8, wv = w * Math.sin(Math.PI * t); pts.push({ x: base.x + (tip.x - base.x) * t - nx * wv, y: base.y + (tip.y - base.y) * t - ny * wv }); }
  objs.push({ kind: "fill", id: id(kind), color, polygon: pts, angle: (ang * 180) / Math.PI + 90 });
}
const STARS: Pt[] = [];
// his star: blue concave star, violet stepped outline with notched points, red seed, flicks in red and blue
function star(cx: number, cy: number, R: number, tilt: number) {
  STARS.push({ x: cx, y: cy });
  const tips = [0, 1, 2, 3].map((k) => P(cx, cy, R, tilt + (k * Math.PI) / 2));
  for (let k = 0; k < 4; k++) {
    const a = tips[k]!, b = tips[(k + 1) % 4]!, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const c = { x: cx + (m.x - cx) * 0.3, y: cy + (m.y - cy) * 0.3 };
    objs.push({ kind: "satin", id: id("star"), color: BLUE, path: Array.from({ length: 11 }, (_, i) => qb(a, c, b, i / 10)), width: 1.3 });
  }
  // violet stepped outline: a notched arrow-point beyond each tip, joined through inner corners
  for (let k = 0; k < 4; k++) {
    const a = tilt + (k * Math.PI) / 2;
    const path = [P(cx, cy, R * 0.78, a - Math.PI / 4), P(cx, cy, R * 1.12, a - 0.42), P(cx, cy, R * 1.45, a), P(cx, cy, R * 1.12, a + 0.42), P(cx, cy, R * 0.78, a + Math.PI / 4)];
    for (let i = 1; i < path.length; i++) objs.push({ kind: "satin", id: id("step"), color: VIOLET, path: [path[i - 1]!, path[i]!], width: 1.0 }); // each edge its own column: no fold at corners
  }
  objs.push({ kind: "fill", id: id("seedrh"), color: RED, polygon: [P(cx, cy, 1.8, tilt - Math.PI / 2), P(cx, cy, 1.8, tilt), P(cx, cy, 1.8, tilt + Math.PI / 2), P(cx, cy, 1.8, tilt + Math.PI)], angle: 45 });
  // flicks: pairs in the four diagonal gaps, red outside, blue inside
  for (let k = 0; k < 4; k++) {
    const d = tilt + Math.PI / 4 + (k * Math.PI) / 2;
    leaf(P(cx, cy, R * 1.5, d - 0.17), d - 0.12, R * 0.48, 0.7, RED, "flick");
    leaf(P(cx, cy, R * 1.5, d + 0.17), d + 0.12, R * 0.48, 0.7, BLUE, "flick");
  }
}
// his branch: three strands — green stem with long leaves, blue strand above, red strand below
function branch(x0: number, x1: number, y: number, amp: number, phase: number) {
  const f = (t: number, off: number): Pt => { const x = x0 + (x1 - x0) * t, yy = y + amp * Math.sin(phase + t * Math.PI * 1.6), dy = amp * Math.cos(phase + t * Math.PI * 1.6) * Math.PI * 1.6 / (x1 - x0), l = Math.hypot(1, dy); return { x: x - (dy / l) * off, y: yy + off / l }; };
  const strand = (t0: number, t1: number, off: number) => Array.from({ length: 31 }, (_, i) => f(t0 + ((t1 - t0) * i) / 30, off));
  objs.push({ kind: "satin", id: id("stem"), color: GREEN, path: strand(0, 1, 0), width: 1.8 });
  objs.push({ kind: "run", id: id("strand"), color: BLUE, path: strand(0.08, 0.86, -1.15), triple: true, length: 2.2 });
  objs.push({ kind: "run", id: id("strand"), color: RED, path: strand(0.16, 0.96, 1.15), triple: true, length: 2.2 });
  for (const [j, t] of [0.3, 0.55, 0.8].entries()) {
    const p = f(t, 0), q = f(t + 0.02, 0), a = Math.atan2(q.y - p.y, q.x - p.x) + (j % 2 ? 0.45 : -0.45);
    leaf({ x: p.x - 2.2 * Math.cos(a), y: p.y - 2.2 * Math.sin(a) }, a, 11, 1.4, GREEN);
  }
}
// his right column: a green flower trailing two wavy tendrils
function flowerWithTendrils(cx: number, cy: number) {
  // one five-lobed flower (separate petals would meet at the centre)
  const fl: Pt[] = [];
  for (let i = 0; i < 70; i++) { const t = (i / 70) * 2 * Math.PI, rr = 5.6 * (0.42 + 0.58 * Math.abs(Math.cos((5 * (t + Math.PI / 2 - 0.2)) / 2)) ** 1.6); fl.push(P(cx, cy, rr, t)); }
  objs.push({ kind: "fill", id: id("petal"), color: GREEN, polygon: fl, angle: 25 });
  for (const dy of [-4.6, 4.6]) {
    const path: Pt[] = Array.from({ length: 41 }, (_, i) => { const t = i / 40; return { x: cx + 4.5 + t * 24, y: cy + dy * (1 + t * 0.5) + 1.6 * Math.sin(t * Math.PI * 5) }; });
    objs.push({ kind: "run", id: id("tendril"), color: GREEN, path, triple: true, length: 1.8 });
  }
}
function smallStar(cx: number, cy: number, R: number, color: string) {
  const pts: Pt[] = []; for (let k = 0; k < 10; k++) { const rr = k % 2 ? R * 0.45 : R; pts.push(P(cx, cy, rr, -Math.PI / 2 + (k * Math.PI) / 5)); }
  objs.push({ kind: "fill", id: id("pstar"), color, polygon: pts, angle: 30 });
}
function lily(cx: number, cy: number, s: number, color: string) {
  leaf({ x: cx, y: cy + s * 0.44 }, -Math.PI / 2, s * 1.1, s * 0.22, color, "finial");
  leaf({ x: cx - s * 0.12, y: cy + s * 0.45 }, -Math.PI / 2 - 1.0, s * 0.8, s * 0.16, color, "finial");
  leaf({ x: cx + s * 0.12, y: cy + s * 0.45 }, -Math.PI / 2 + 1.0, s * 0.8, s * 0.16, color, "finial");
  objs.push({ kind: "satin", id: id("lilybar"), color, path: [{ x: cx - s * 0.45, y: cy + s * 0.48 }, { x: cx + s * 0.45, y: cy + s * 0.48 }], width: 1.5 });
}
function sprig(cx: number, cy: number, s: number, dir: number, color: string) {
  objs.push({ kind: "satin", id: id("sprig"), color, path: [{ x: cx - dir * s * 0.6, y: cy }, { x: cx + dir * s * 0.6, y: cy }], width: 1.1 });
  for (let k = 0; k < 3; k++) { const bx = cx - dir * s * 0.5 + dir * k * s * 0.42; leaf({ x: bx, y: cy }, dir > 0 ? -Math.PI * 0.78 : -Math.PI * 0.22, s * 0.38, s * 0.07, color, "finial"); leaf({ x: bx, y: cy }, dir > 0 ? Math.PI * 0.78 : Math.PI * 0.22, s * 0.38, s * 0.07, color, "finial"); }
}
function rhombStar(cx: number, cy: number, R: number, color: string) {
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 - Math.PI / 2; objs.push({ kind: "fill", id: id("zv"), color, polygon: [P(cx, cy, R * 0.18, a), P(cx, cy, R * 0.62, a + 0.28), P(cx, cy, R, a), P(cx, cy, R * 0.62, a - 0.28)], angle: (a * 180) / Math.PI + 90 }); }
}
function chevronBand(x0: number, x1: number, y: number, h: number, color: string, centre: (cx: number, cy: number) => void) {
  const cx = (x0 + x1) / 2, gap = 14, step = 7;
  for (let x = x0; x < cx - gap; x += step) objs.push({ kind: "satin", id: id("chev"), color, path: [{ x, y: y - h / 2 }, { x: x + h * 0.55, y }, { x, y: y + h / 2 }], width: 1.4 });
  for (let x = x1; x > cx + gap; x -= step) objs.push({ kind: "satin", id: id("chev"), color, path: [{ x, y: y - h / 2 }, { x: x - h * 0.55, y }, { x, y: y + h / 2 }], width: 1.4 });
  centre(cx, y);
}

// ---- layout (mm), after the sheet ----
const rich = mode === "rich";
const OY = rich ? 30 : 6, OX = rich ? 12 : 2;
const colX = [36, 64, 92, 120].map((x) => x + OX), rowY = [16, 54, 90, 126, 162].map((y) => y + OY), R = 6.2;
const tilts = [0.05, -0.08, 0.1, -0.04, 0.07];
rowY.forEach((y, r) => colX.forEach((x, k) => star(x + (r % 2 ? 3 : 0), y, R, tilts[(r + k) % 5]!)));
[35, 72, 108, 144].forEach((y, i) => branch(colX[0]! - 16, colX[3]! + 14, y + OY, 3.4, [0.2, 3.4, 0.8, 3.0][i]!));
rowY.forEach((y) => smallStar(OX + 8, y + 6, 3.2, DBLUE));
[0, 1, 2, 3, 4].forEach((i) => smallStar(colX[3]! + 22, rowY[i]! - 4 + (i % 2) * 2, 3, DBLUE));
[30, 70, 104, 140].forEach((y) => flowerWithTendrils(colX[3]! + 26, y + OY + 4));
const W = colX[3]! + 64, bottom = rowY[4]! + 16;
if (rich) {
  chevronBand(10, W - 10, 18, 9, VIOLET, (cx, cy) => rhombStar(cx, cy, 8, RED));
  chevronBand(10, W - 10, bottom + 4, 9, VIOLET, (cx, cy) => rhombStar(cx, cy, 8, RED));
  lily(W / 2, bottom + 26, 15, BLUE); lily(W / 2 - 40, bottom + 29, 10, BLUE); lily(W / 2 + 40, bottom + 29, 10, BLUE);
  sprig(26, bottom + 28, 16, 1, GREEN); sprig(W - 26, bottom + 28, 16, -1, GREEN);
  const H0 = bottom + 46;
  for (const inset of [4, 6.5]) objs.push({ kind: "run", id: id("frame"), color: RED, path: [{ x: inset, y: inset }, { x: W - inset, y: inset }, { x: W - inset, y: H0 - inset }, { x: inset, y: H0 - inset }, { x: inset, y: inset }], triple: true, length: 2.5 });
} else {
  lily(colX[1]! - 6, bottom + 16, 12, BLUE); sprig(colX[2]! - 2, bottom + 18, 15, 1, BLUE); sprig(colX[3]! + 6, bottom + 18, 15, -1, BLUE);
}
const H = rich ? bottom + 46 : bottom + 30;

// clearance: flicks/leaves/tendrils that crowd another motif are dropped; near-touching joins are pushed onto their stem
{
  const pts = (o: any): Pt[] => o.kind === "fill" ? o.polygon : o.path;
  const halfW = (o: any) => o.kind === "satin" ? o.width / 2 : o.kind === "run" ? 0.45 : 0;
  const gap = (a: any, b: any) => { let d = Infinity; for (const p of pts(a)) for (const q of pts(b)) d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y)); return d - halfW(a) - halfW(b); };
  const box = (o: any) => { const p = pts(o); return [Math.min(...p.map((q) => q.x)), Math.min(...p.map((q) => q.y)), Math.max(...p.map((q) => q.x)), Math.max(...p.map((q) => q.y))]; };
  const bx = objs.map(box);
  const near = (i: number, j: number) => bx[i]![0]! - 2 < bx[j]![2]! && bx[j]![0]! - 2 < bx[i]![2]! && bx[i]![1]! - 2 < bx[j]![3]! && bx[j]![1]! - 2 < bx[i]![3]!;
  const fam = (o: any) => o.id.split("-")[0];
  const drop = new Set<number>();
  for (let i = 0; i < objs.length; i++) for (let j = 0; j < objs.length; j++) {
    if (i === j || drop.has(i) || drop.has(j) || !near(i, j)) continue;
    const a: any = objs[i], b: any = objs[j];
    if (!["flick", "leaf", "tendril"].includes(fam(a))) continue;
    if (fam(a) === "leaf" && (fam(b) === "stem" || fam(b) === "strand")) continue; // leaves belong to their branch
    if (fam(a) === "strand" && fam(b) === "stem") continue;
    const g = gap(a, b);
    if (g > -0.05 && g < 0.8) { drop.add(i); if (process.env.CLR) console.log("pair", a.id, b.id, g.toFixed(2)); }
  }
  if (process.env.CLR) for (const i of drop) console.log('drop', (objs[i] as any).id);
  [...drop].sort((x, y) => y - x).forEach((i) => objs.splice(i, 1));
}

const body = objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const tag = `${mode}${ground === "#f4f2ee" ? "" : "-" + ground.slice(1)}`;
writeFileSync(`${out}/sheet2-${tag}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${ground}"/>${body}</svg>`);
if (process.env.DBG) { const { shortByType } = await import("./debug-short.mts"); console.log(shortByType(objs)); }
const r = recipes["linen-180-prewashed"]!;
const p = plan(objs, r);
const g = runGate(objs, p.commands, r, { hoop: { name: "240x300", width: 240, height: 300 } }, estimateMinutes(p, r.speedSpm));
writeFileSync(`${out}/sheet2-${mode}.dst`, writeDst(p.commands, { label: `OLEKSANDR-${mode}`.slice(0, 16) }));
writeFileSync(`${out}/sheet2-${mode}-stitches.svg`, previewSvg(p.commands, p.colors));
console.log(JSON.stringify({ mode, sizeMm: `${W.toFixed(0)}x${H.toFixed(0)}`, stitches: p.commands.filter((x) => x.cmd === "stitch").length, minutes: +estimateMinutes(p, r.speedSpm).toFixed(1), colors: p.colors.length, failed: g.checks.filter((x) => !x.pass && x.id !== "recipe-validated").map((x) => `${x.id}: ${x.detail}`) }));
