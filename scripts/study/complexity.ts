/**
 * How complex is real embroidery? Scale-free measures of an ornament image, so museum towels, shirts and skirts can
 * be compared with each other and with ASCEND designs (the same function scores a rendered design).
 *
 *   cover        share of the cloth covered by ornament (ink)
 *   elements     separate motifs and parts in view (how busy), at the study resolution (longest side 384 px)
 *   levels       distinct size scales in use (big forms, medium motifs, small fillers, seeds: up to ~6)
 *   fine         share of elements smaller than a quarter of the median (fine detail)
 *   colors       thread colours covering ≥ 3 % of the ornament
 *   edges        share of pixels on a strong colour edge (line work and texture)
 *   mirror       share of motifs with a twin across the best vertical axis
 */
import { learnImage, type Raster } from "../train/learn.ts";

export type Complexity = { cover: number; elements: number; levels: number; fine: number; colors: number; edges: number; mirror: number };
export const MEASURES: (keyof Complexity)[] = ["cover", "elements", "levels", "fine", "colors", "edges", "mirror"];

/** Object type from catalogue text (Ukrainian, Russian, Polish, English). */
export function objectTypeOf(text: string): "towel" | "shirt" | "skirt" | null {
  const t = text.toLowerCase();
  if (/(рушник|ручник|полотенц|towel|rushnyk|ruchnyk|ręcznik)/.test(t)) return "towel";
  if (/(спідниц|плахт|запаск|юбк|понев|skirt|apron|fartuch|spódnic|ponev|zapaska|plakhta)/.test(t)) return "skirt";
  if (/(сорочк|вишиванк|рубах|shirt|blouse|chemise|koszul|sorochka|vyshyvanka)/.test(t)) return "shirt";
  return null;
}

/** The centre of a photo, where the textile is (museum photos have a margin of background). */
export function centre(img: Raster, keep = 0.72): Raster {
  const w = Math.round(img.width * keep), h = Math.round(img.height * keep), x0 = Math.floor((img.width - w) / 2), y0 = Math.floor((img.height - h) / 2);
  const data = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) data[(y * w + x) * 3 + c] = img.data[((y + y0) * img.width + x + x0) * 3 + c]!;
  return { data, width: w, height: h };
}

export function complexityOf(img: Raster): Complexity {
  const L = learnImage(img, 400);
  const els = L.elements, n = els.length;
  const areas = els.map((e) => e.area).sort((a, b) => a - b), med = areas[Math.floor(n / 2)] ?? 1;
  // size levels: octaves of element area that hold at least two elements
  const oct = new Map<number, number>(); for (const a of areas) { const k = Math.round(Math.log2(a / med)); oct.set(k, (oct.get(k) ?? 0) + 1); }
  const levels = [...oct.values()].filter((v) => v >= 2).length;
  // colours: the ornament's palette entries covering ≥ 3 % of the ornament
  const inkShare = L.palette.reduce((s, p) => s + p.share, 0) || 1;
  const colors = L.palette.filter((p) => p.share / inkShare >= 0.03).length;
  // edges: strong colour steps between neighbouring pixels
  let edge = 0; const w = img.width, h = img.height, d = img.data;
  for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 3, l = i - 3, u = i - w * 3;
    const g = Math.abs(d[i]! - d[l]!) + Math.abs(d[i + 1]! - d[l + 1]!) + Math.abs(d[i + 2]! - d[l + 2]!) + Math.abs(d[i]! - d[u]!) + Math.abs(d[i + 1]! - d[u + 1]!) + Math.abs(d[i + 2]! - d[u + 2]!);
    if (g > 120) edge++;
  }
  // mirror: motifs with a same-shaped twin across the best vertical axis
  let mirror = 0;
  const big = els.filter((e) => e.area >= med * 0.5 && e.x !== undefined);
  for (const axis of [0.5, ...big.slice(0, 30).map((e) => e.x!)]) {
    const hit = big.filter((e) => big.some((f) => f !== e && Math.abs(f.area / e.area - 1) < 0.35 && Math.abs(f.x! - (2 * axis - e.x!)) < 0.03 && Math.abs(f.y! - e.y!) < 0.03)).length;
    mirror = Math.max(mirror, big.length ? hit / big.length : 0);
  }
  return {
    cover: +L.density.toFixed(3),
    elements: n,
    levels, fine: +(n ? els.filter((e) => e.area < med / 4).length / n : 0).toFixed(3), colors,
    edges: +(edge / (w * h)).toFixed(3), mirror: +mirror.toFixed(3),
  };
}

export type Profile = { n: number } & Record<keyof Complexity, { p25: number; median: number; p75: number }>;
export function profileOf(cs: Complexity[]): Profile {
  const q = (v: number[], f: number) => { const s = [...v].sort((a, b) => a - b); return +(s[Math.min(s.length - 1, Math.floor(f * s.length))] ?? 0).toFixed(3); };
  const out = { n: cs.length } as Profile;
  for (const m of MEASURES) { const v = cs.map((c) => c[m]); (out as any)[m] = { p25: q(v, 0.25), median: q(v, 0.5), p75: q(v, 0.75) }; }
  return out;
}

/** How far a design sits from a profile: 0 = inside the middle half on every measure; each measure outside adds its distance in inter-quartile ranges. */
export function distanceToProfile(c: Complexity, p: Profile): { score: number; low: string[]; high: string[] } {
  let score = 0; const low: string[] = [], high: string[] = [];
  for (const m of MEASURES) {
    const r = p[m], iqr = Math.max(1e-3, r.p75 - r.p25);
    if (c[m] < r.p25) { score += (r.p25 - c[m]) / iqr; low.push(m); } else if (c[m] > r.p75) { score += (c[m] - r.p75) / iqr; high.push(m); }
  }
  return { score: +score.toFixed(2), low, high };
}

