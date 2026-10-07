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
const PAL2: Record<string, { ground: string; star: string; starB: string; seed: string; branch: string; bud: string; bloom: string; side: string; chev: string; frame: string; lily: string }> = {
  pencil: { ground: "#f3f1ec", star: "#2f86b0", starB: "#3f9bc4", seed: "#2a6f93", branch: "#2f86b0", bud: "#4fa3c7", bloom: "#2a6f93", side: "#2f86b0", chev: "#2f86b0", frame: "#4fa3c7", lily: "#2a6f93" },
  ascend: { ground: "#13131e", star: "#a393c5", starB: "#b8aad6", seed: "#cc662b", branch: "#b89569", bud: "#e0b18e", bloom: "#e0b18e", side: "#a393c5", chev: "#b89569", frame: "#75615e", lily: "#cc662b" },
  linen: { ground: "#efe9dc", star: "#3d4088", starB: "#4a4f9c", seed: "#cc662b", branch: "#3d4088", bud: "#cc662b", bloom: "#cc662b", side: "#3d4088", chev: "#3d4088", frame: "#b89569", lily: "#cc662b" },
};
const objs: DesignObject[] = [];
let n = 0;
const id = (s: string) => `${s}-${n++}`;
const qb = (a: Pt, ctl: Pt, b: Pt, t: number): Pt => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctl.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctl.y + t * t * b.y });

// concave four-point star with seed-flicks around it (the sheet's main motif)
function star2(cx: number, cy: number, R: number, tilt: number, color: string) { return starImpl(cx, cy, R, tilt, color); }
function star(cx: number, cy: number, R: number, tilt: number) { return starImpl(cx, cy, R, tilt, c.star); }
function starImpl(cx: number, cy: number, R: number, tilt: number, starColor: string) {
  const tips = [0, 1, 2, 3].map((k) => { const a = tilt + (k * Math.PI) / 2; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  // four arcs meeting at the points (a single column folds at the cusps)
  for (let k = 0; k < 4; k++) {
    const a = tips[k]!, b = tips[(k + 1) % 4]!, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const ctl = { x: cx + (mid.x - cx) * 0.3, y: cy + (mid.y - cy) * 0.3 };
    objs.push({ kind: "satin", id: id("star"), color: starColor, path: Array.from({ length: 11 }, (_, i) => qb(a, ctl, b, i / 10)), width: 1.3 });
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


const c2 = PAL2[variant]!;
function tri(p: Pt, q: Pt, r: Pt): Pt[] { return [p, q, r]; }
// rhomb-cell eight-point star («звізда», purple sheet): eight rhombs meeting at the centre
function rhombStar(cx: number, cy: number, R: number, color: string) {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2, s = 0.28;
    const p = (rr: number, da: number) => ({ x: cx + rr * Math.cos(a + da), y: cy + rr * Math.sin(a + da) });
    objs.push({ kind: "fill", id: id("zv"), color, polygon: [p(R * 0.18, 0), p(R * 0.62, s), p(R, 0), p(R * 0.62, -s)], angle: (a * 180) / Math.PI + 90 });
  }
}
// rhomb-petal rosette («ружа»): a ring with eight small rhomb petals outside it
function ruzha(cx: number, cy: number, r: number, color: string) {
  rosetteRing(cx, cy, r, color);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    const p = (rr: number, da: number) => ({ x: cx + rr * Math.cos(a + da), y: cy + rr * Math.sin(a + da) });
    objs.push({ kind: "fill", id: id("ru"), color, polygon: [p(r * 1.62, 0), p(r * 2.1, 0.2), p(r * 2.6, 0), p(r * 2.1, -0.2)], angle: (a * 180) / Math.PI });
  }
  objs.push({ kind: "fill", id: id("ru-seed"), color, polygon: [{ x: cx, y: cy - 1.3 }, { x: cx + 1.3, y: cy }, { x: cx, y: cy + 1.3 }, { x: cx - 1.3, y: cy }], angle: 45 });
}
function rosetteRing(cx: number, cy: number, r: number, color: string) {
  objs.push({ kind: "satin", id: id("ring"), color, path: Array.from({ length: 25 }, (_, i) => ({ x: cx + r * Math.cos((i / 24) * 2 * Math.PI), y: cy + r * Math.sin((i / 24) * 2 * Math.PI) })), width: 1.2 });
}
// seeded centre for the field stars («засіяне поле»)
function seed(cx: number, cy: number, color: string) {
  objs.push({ kind: "fill", id: id("seedrh"), color, polygon: [{ x: cx, y: cy - 1.9 }, { x: cx + 1.9, y: cy }, { x: cx, y: cy + 1.9 }, { x: cx - 1.9, y: cy }], angle: 45 });
}
// leaf / bud / blossom
function leaf(base: Pt, ang: number, len: number, w: number, color: string, kind = "leaf") {
  const tip = { x: base.x + len * Math.cos(ang), y: base.y + len * Math.sin(ang) }, nx = -Math.sin(ang), ny = Math.cos(ang);
  const pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, wv = w * Math.sin(Math.PI * t); pts.push({ x: base.x + (tip.x - base.x) * t + nx * wv, y: base.y + (tip.y - base.y) * t + ny * wv }); }
  for (let i = 7; i >= 1; i--) { const t = i / 8, wv = w * Math.sin(Math.PI * t); pts.push({ x: base.x + (tip.x - base.x) * t - nx * wv, y: base.y + (tip.y - base.y) * t - ny * wv }); }
  objs.push({ kind: "fill", id: id(kind), color, polygon: pts, angle: (ang * 180) / Math.PI + 90 });
}
function blossom(cx: number, cy: number, r: number, color: string) {
  // one five-lobed flower outline (separate petals would meet at the centre with no gap)
  const pts: Pt[] = [];
  for (let i = 0; i < 60; i++) { const t = (i / 60) * 2 * Math.PI, rr = (r + 0.9) * (0.5 + 0.5 * Math.abs(Math.cos((5 * (t + Math.PI / 2)) / 2))); pts.push({ x: cx + rr * Math.cos(t), y: cy + rr * Math.sin(t) }); }
  objs.push({ kind: "fill", id: id("bloom"), color, polygon: pts, angle: 20 });
}
// branch with buds and blossoms (enriched)
function richBranch(x0: number, x1: number, y: number, amp: number, phase: number, side: number) {
  const stem: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; stem.push({ x: x0 + (x1 - x0) * t, y: y + amp * Math.sin(phase + t * Math.PI * 1.6) }); }
  objs.push({ kind: "satin", id: id("stem"), color: c2.branch, path: stem, width: 1.6 });
  for (const [j, t] of [0.16, 0.34, 0.52, 0.7, 0.86].entries()) {
    const i = Math.round(t * 40), p = stem[i]!, q = stem[i + 1]!;
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy), sd = (j % 2 ? 1 : -1) * side;
    const nx = (-dy / l) * sd, ny = (dx / l) * sd;
    const end = { x: p.x + (dx / l) * 6 + nx * 3.4, y: p.y + (dy / l) * 6 + ny * 3.4 };
    objs.push({ kind: "run", id: id("twig"), color: c2.branch, path: [p, { x: p.x + (dx / l) * 3 + nx * 2, y: p.y + (dy / l) * 3 + ny * 2 }, end], triple: true, length: 2 });
    const bx = end.x, by = end.y;
    const crowded = STARS.some((st) => Math.hypot(st.x - bx, st.y - by) < 13.5);
    const ang = Math.atan2(end.y - p.y, end.x - p.x), joint = { x: end.x - 0.8 * Math.cos(ang), y: end.y - 0.8 * Math.sin(ang) };
    if (j % 2 || crowded) leaf(joint, ang, crowded ? 2.6 : 3.6, crowded ? 0.9 : 1.1, c2.bud); // bud
    else blossom(bx, by, 2.2, c2.bloom);
  }
}
// chevron border («в ялинки» from the purple sheet), mirrored to meet a central motif
function chevronBand(x0: number, x1: number, y: number, h: number, color: string, centre: (cx: number, cy: number) => void) {
  const cx = (x0 + x1) / 2, gap = 14, step = 7;
  for (let x = x0; x < cx - gap; x += step) objs.push({ kind: "satin", id: id("chev"), color, path: [{ x, y: y - h / 2 }, { x: x + h * 0.55, y }, { x, y: y + h / 2 }], width: 1.4 });
  for (let x = x1; x > cx + gap; x -= step) objs.push({ kind: "satin", id: id("chev"), color, path: [{ x, y: y - h / 2 }, { x: x - h * 0.55, y }, { x, y: y + h / 2 }], width: 1.4 });
  centre(cx, y);
}
// lily (blue sheet, bottom): central petal, two curling side petals, base bar
function lily(cx: number, cy: number, s: number, color: string) {
  leaf({ x: cx, y: cy + s * 0.44 }, -Math.PI / 2, s * 1.1, s * 0.22, color, "finial");
  leaf({ x: cx - s * 0.12, y: cy + s * 0.45 }, -Math.PI / 2 - 1.0, s * 0.8, s * 0.16, color, "finial");
  leaf({ x: cx + s * 0.12, y: cy + s * 0.45 }, -Math.PI / 2 + 1.0, s * 0.8, s * 0.16, color, "finial");
  objs.push({ kind: "satin", id: id("lilybar"), color, path: [{ x: cx - s * 0.45, y: cy + s * 0.48 }, { x: cx + s * 0.45, y: cy + s * 0.48 }], width: 1.5 });
}
// feather sprig (blue sheet, bottom): stem with three pairs of slanted leaves
function sprig(cx: number, cy: number, s: number, dir: number, color: string) {
  objs.push({ kind: "satin", id: id("sprig"), color, path: [{ x: cx - dir * s * 0.6, y: cy }, { x: cx + dir * s * 0.6, y: cy }], width: 1.1 });
  for (let k = 0; k < 3; k++) {
    const bx = cx - dir * s * 0.5 + dir * k * s * 0.42;
    leaf({ x: bx, y: cy }, dir > 0 ? -Math.PI * 0.78 : -Math.PI * 0.22, s * 0.38, s * 0.07, color, "finial");
    leaf({ x: bx, y: cy }, dir > 0 ? Math.PI * 0.78 : Math.PI * 0.22, s * 0.38, s * 0.07, color, "finial");
  }
}

// ---- elaborated layout (mm) ----
const OY = 26; // field shifted down for the top border
const STARS: Pt[] = [];
const colX = [62, 88, 114, 140], rowY = [24, 58, 92, 124, 160].map((y) => y + OY), R = 6.5;
const tilts = [0.05, -0.08, 0.1, -0.04, 0.07];
rowY.forEach((y, r) => colX.forEach((x, k) => {
  const shimmer = (r + k) % 2 ? c2.starB : c2.star;           // close-hue alternation
  star2(x, y, R, tilts[(r + k) % 5]!, shimmer); STARS.push({ x, y });
  seed(x, y, c2.seed);
}));
richBranch(48, 150, 41 + OY, 3.2, 0.2, 1);
richBranch(46, 152, 75 + OY, 3.6, 3.4, -1);
richBranch(50, 150, 108 + OY, 3, 0.8, 1);
richBranch(52, 148, 142 + OY, 3.4, 3.0, -1);
rowY.forEach((y, r) => { if (r % 2) rhombStar(22, y, 7, c2.side); else ruzha(22, y, 2.8, c2.side); });
rowY.forEach((y, r) => { if (r % 2) ruzha(170, y, 2.8, c2.side); else rhombStar(170, y, 7, c2.side); });
// frame: double boot-stitch line
for (const inset of [4, 6.5]) objs.push({ kind: "run", id: id("frame"), color: c2.frame, path: [{ x: inset, y: inset }, { x: 192 - inset, y: inset }, { x: 192 - inset, y: 262 - inset }, { x: inset, y: 262 - inset }, { x: inset, y: inset }], triple: true, length: 2.5 });
// top border: chevrons meeting a rhomb star
chevronBand(14, 178, 18, 9, c2.chev, (cx, cy) => rhombStar(cx, cy, 8, c2.seed));
// bottom finial: lily centre, sprigs, small lilies, chevrons
const by = 214;
chevronBand(14, 178, by, 9, c2.chev, (cx, cy) => ruzha(cx, cy, 3, c2.seed));
lily(96, 238, 16, c2.lily);
lily(56, 241, 10, c2.lily); lily(136, 241, 10, c2.lily);
sprig(28, 240, 16, 1, c2.branch); sprig(164, 240, 16, -1, c2.branch);
// clearance pass: branch decorations (buds, blossom petals) must keep 1 mm from the star flicks
{
  const pts = (o: any): Pt[] => o.kind === "fill" ? o.polygon : o.path;
  const flicks = objs.filter((o) => o.id.startsWith("seed-"));
  const near = (o: any) => flicks.some((f) => pts(f).some((a) => pts(o).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 1.0)));
  for (let i = objs.length - 1; i >= 0; i--) if ((objs[i]!.id.startsWith("leaf-") || objs[i]!.id.startsWith("bloom-") || objs[i]!.id.startsWith("twig-")) && near(objs[i])) objs.splice(i, 1);
  // decorations whose twig was removed would float: drop any bud/blossom more than 1.5 mm from every twig and stem
  const lines = objs.filter((o) => o.id.startsWith("twig-") || o.id.startsWith("stem-"));
  const attached = (o: any) => lines.some((l) => pts(l).some((a) => pts(o).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 2.5)));
  for (let i = objs.length - 1; i >= 0; i--) if ((objs[i]!.id.startsWith("leaf-") || objs[i]!.id.startsWith("bloom-")) && !attached(objs[i])) objs.splice(i, 1);
}
// join pass: a bud or petal that almost touches a twig/stem (gap under 0.8 mm) is moved onto it, so it joins
{
  const segDist = (p: Pt, a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; const u = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0; const q = { x: a.x + u * dx, y: a.y + u * dy }; return { d: Math.hypot(p.x - q.x, p.y - q.y), q }; };
  const lines = objs.filter((o) => o.id.startsWith("twig-") || o.id.startsWith("stem-")) as any[];
  for (const o of objs.filter((o) => o.id.startsWith("leaf-") || o.id.startsWith("bloom-")) as any[]) {
    let best = { d: Infinity, p: o.polygon[0] as Pt, q: o.polygon[0] as Pt, half: 0 };
    for (const ln of lines) { const half = ln.kind === "satin" ? ln.width / 2 : 0.45; for (const p of o.polygon) for (let k = 1; k < ln.path.length; k++) { const r = segDist(p, ln.path[k - 1], ln.path[k]); if (r.d - half < best.d - best.half) best = { d: r.d, p, q: r.q, half }; } }
    const gap = best.d - best.half;
    if (gap > 0 && gap < 0.8) { const ux = (best.q.x - best.p.x) / best.d, uy = (best.q.y - best.p.y) / best.d, m = gap + 0.3; o.polygon = o.polygon.map((p: Pt) => ({ x: p.x + ux * m, y: p.y + uy * m })); }
  }
}
const W = 192, H = 262;
const body = objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : (o as any).triple ? 0.9 : 0.5}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
writeFileSync(`${out}/sheet1-rich-${variant}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${c2.ground}"/>${body}</svg>`);
if (process.env.DBG2) { for (const o of objs.filter((o) => ["twig-299","leaf-302","leaf-301","leaf-303","twig-298"].includes(o.id))) console.log(o.id, JSON.stringify(((o as any).polygon ?? (o as any).path).slice(0,3).map((p: any) => [+p.x.toFixed(1), +p.y.toFixed(1)]))); }
if (process.env.DBG) { const { shortByType } = await import("./debug-short.mts"); console.log(shortByType(objs)); }
if (variant === "linen") {
  const r = recipes["linen-180-prewashed"]!;
  const p = plan(objs, r);
  const g = runGate(objs, p.commands, r, { hoop: { name: "240x300", width: 240, height: 300 } }, estimateMinutes(p, r.speedSpm));
  writeFileSync(`${out}/sheet1-rich.dst`, writeDst(p.commands, { label: "OLEKSANDR-S1R" }));
  writeFileSync(`${out}/sheet1-rich-stitches.svg`, previewSvg(p.commands, p.colors));
  console.log(JSON.stringify({ objects: objs.length, stitches: p.commands.filter((x) => x.cmd === "stitch").length, minutes: +estimateMinutes(p, r.speedSpm).toFixed(1), colors: p.colors.length, failed: g.checks.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) }));
}
