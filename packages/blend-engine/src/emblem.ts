/**
 * Personal emblem (Oleksandr), built from the ASCEND vocabulary of his own drawings, read bottom-up:
 * roots (origin, family) → axis (standing) → heart (the reason) → twin peaks forming "A" (the climb,
 * ASCEND, Oleksandr) → orbit forming "O" (protection), opened at the base where the roots pass → star
 * (the reach). Embroidery for the forms; sequins where light belongs (star, orbit, seeds).
 * Coordinates in mm; overall about 70 × 96 mm (chest or sleeve placement).
 */
import type { DesignObject } from "../../stitch-engine/src/index.ts";
import { ASCEND_PALETTE as C } from "./ascend.js";

export interface Sequin { x: number; y: number; d: number; color: string; part: string }
export interface Emblem { objects: DesignObject[]; sequins: Sequin[]; width: number; height: number; meaning: { part: string; reads: string }[] }

type Pt = { x: number; y: number };
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });

export function emblem(colors: { orbit: string; peaks: string; heart: string; roots: string; star: string; sequin: string; sequinStar: string } = {
  orbit: C.lavender, peaks: C.lilac, heart: C.ember, roots: C.sand, star: C.peach, sequin: "#d4a24c", sequinStar: "#e8c372",
}): Emblem {
  const cx = 35, cy = 46;
  const objects: DesignObject[] = [];
  // Orbit = "O": open at the base (a void the axis passes through), satin 3 mm
  const gap = 0.32; // radians either side of straight down
  objects.push({ kind: "satin", id: "orbit", color: colors.orbit, path: arc(cx, cy, 27, 31, Math.PI / 2 + gap, Math.PI / 2 + 2 * Math.PI - gap, 64), width: 3 });
  // Twin peaks = "A": two legs meeting in a notched double apex (left peak taller), crossbar as the horizon
  objects.push({ kind: "fill", id: "peak-left", color: colors.peaks, polygon: [{ x: 18, y: 66 }, { x: 31.5, y: 22 }, { x: 36.5, y: 31 }, { x: 25.5, y: 66 }], angle: 60 });
  objects.push({ kind: "fill", id: "peak-right", color: colors.peaks, polygon: [{ x: 36.4, y: 37.5 }, { x: 39.6, y: 27 }, { x: 52, y: 66 }, { x: 44.5, y: 66 }], angle: -60 });
  objects.push({ kind: "satin", id: "horizon", color: colors.peaks, path: [{ x: 26.5, y: 50 }, { x: 43.5, y: 50 }], width: 2 });
  // Heart under the horizon, between the legs
  const heart: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * 2 * Math.PI, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    heart.push({ x: cx + x * 0.36, y: 58.5 - y * 0.36 });
  }
  objects.push({ kind: "fill", id: "heart", color: colors.heart, polygon: heart, angle: 30 });
  // Axis from the heart down through the orbit's opening into the roots
  objects.push({ kind: "satin", id: "axis", color: colors.roots, path: [{ x: cx, y: 65.5 }, { x: cx, y: 82 }], width: 2 });
  // Roots: three, triple-run, spreading unevenly like the drawings
  for (const [i, end] of ([[22, 93], [33, 95.5], [48, 92.5]] as [number, number][]).entries())
    objects.push({ kind: "run", id: `root-${i}`, color: colors.roots, path: [{ x: cx, y: 82 }, { x: (cx + end[0]) / 2 + (i - 1) * 1.5, y: 88 }, { x: end[0], y: end[1] }], triple: true, length: 2 });
  // Star: eight rays around a sequin, at the top of the axis line, beyond the orbit
  for (let k = 0; k < 8; k++) {
    if (k === 4) continue; // no downward ray: the star hovers above the orbit, reached for, not attached
    const a = (k * Math.PI) / 4 - Math.PI / 2, r0 = 4.2, r1 = k % 2 ? 6 : 9.5;
    objects.push({ kind: "satin", id: `ray-${k}`, color: colors.star, path: [{ x: cx + r0 * Math.cos(a), y: 6.5 + 4 + r0 * Math.sin(a) }, { x: cx + r1 * Math.cos(a), y: 6.5 + 4 + r1 * Math.sin(a) }], width: 1.2 });
  }
  // Sequins: the star's centre, seven seeds of light along the orbit, three seeds among the roots
  const sequins: Sequin[] = [{ x: cx, y: 10.5, d: 6, color: colors.sequinStar, part: "star" }];
  for (let k = 0; k < 7; k++) {
    const a = Math.PI / 2 + gap + 0.55 + (k * (2 * Math.PI - 2 * gap - 1.1)) / 6;
    if (Math.abs(Math.sin(a) + 1) < 0.08) continue; // keep the top clear under the star
    sequins.push({ x: cx + 31.5 * Math.cos(a), y: cy + 35.5 * Math.sin(a), d: 4, color: colors.sequin, part: "orbit" });
  }
  for (const [x, y] of [[27, 90], [41, 90.5], [34.5, 91.5]] as [number, number][]) sequins.push({ x, y: y + 0, d: 3, color: colors.sequin, part: "roots" });
  return {
    objects, sequins, width: 70, height: 98,
    meaning: [
      { part: "roots", reads: "origin, Ukraine, family; seeds of light among them" },
      { part: "axis", reads: "standing — the figure of the drawings" },
      { part: "heart", reads: "the reason" },
      { part: "twin peaks = A", reads: "the climb; ASCEND; Oleksandr" },
      { part: "orbit = O", reads: "protection around family and defenders; open at the base where the roots pass" },
      { part: "star", reads: "the reach — the raised hand of the drawings" },
    ],
  };
}

/** Preview with sequins drawn as discs with a highlight (sheen) and a centre hole. */
export function emblemSvg(e: Emblem, ground: string): string {
  const parts: string[] = [];
  for (const o of e.objects) {
    if (o.kind === "fill") parts.push(`<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`);
    else parts.push(`<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  const defs = `<defs><radialGradient id="sheen" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>`;
  for (const s of e.sequins) parts.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.d / 2}" fill="${s.color}"/><circle cx="${s.x}" cy="${s.y}" r="${s.d / 2}" fill="url(#sheen)"/><circle cx="${s.x}" cy="${s.y}" r="${s.d * 0.12}" fill="${ground}" opacity=".7"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${e.width}mm" height="${e.height}mm" viewBox="0 0 ${e.width} ${e.height}">${defs}<rect width="100%" height="100%" fill="${ground}"/>${parts.join("")}</svg>`;
}
