/**
 * How complex is real embroidery? Scale-free measures of an ornament image, so museum towels, shirts and skirts can
 * be compared with each other and with ASCEND designs (the same function scores a rendered design).
 *
 *   cover        share of the cloth covered by ornament (ink)
 *   elements     separate pieces of ornament in view (how busy), at the study resolution (longest side 384 px)
 *
 * Photos and renders are both lightly blurred first, so crisp vector renders and soft photos compare fairly.
 *   levels       distinct size scales in use (big forms, medium motifs, small fillers, seeds: up to ~6)
 *   fine         share of elements smaller than a quarter of the median (fine detail)
 *   colors       thread colours (near-identical shades merged) covering ≥ 4 % of the ornament
 *   edges        share of pixels on a strong colour edge (line work and texture)
 *   mirror       how far the ornament matches itself turned over about the vertical centre line (0–1)
 */
import { components, foreground, paletteOf, type Raster } from "../train/learn.ts";

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

/** A light blur, so a crisp render and a museum photo are measured on the same footing. */
function soften(img: Raster): Raster {
  const { width: w, height: h, data: d } = img, out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) { s += d[(Y * w + X) * 3 + c]!; n++; } }
    out[(y * w + x) * 3 + c] = s / n;
  }
  return { data: out, width: w, height: h };
}

export function complexityOf(raw: Raster): Complexity {
  const img = soften(raw), { width: w, height: h, data: d } = img;
  // palette with more clusters than threads, then near-identical shades merged: the colours actually in use
  const { palette, groundIndex } = paletteOf(img, 10);
  const ground = palette[groundIndex]!.rgb;
  const merged: { rgb: number[]; share: number }[] = [];
  for (const p of palette.filter((_, j) => j !== groundIndex).sort((a, b) => b.share - a.share)) {
    const m = merged.find((q) => Math.hypot(q.rgb[0]! - p.rgb[0], q.rgb[1]! - p.rgb[1], q.rgb[2]! - p.rgb[2]) < 45);
    if (m) m.share += p.share; else merged.push({ rgb: [...p.rgb], share: p.share });
  }
  const inkShare = merged.reduce((s, p) => s + p.share, 0) || 1;
  const colors = merged.filter((p) => p.share / inkShare >= 0.04).length;
  // every separate piece of ornament, large connected forms included
  const mask = foreground(img, ground);
  let fg = 0; for (const v of mask) fg += v;
  const parts = components(mask, w, h, 0.0002, 1).map((c) => c.length).sort((a, b) => a - b);
  const n = parts.length, med = parts[Math.floor(n / 2)] ?? 1;
  const oct = new Map<number, number>(); for (const a of parts) { const k = Math.round(Math.log2(a / med)); oct.set(k, (oct.get(k) ?? 0) + 1); }
  const levels = [...oct.values()].filter((v) => v >= 2).length;
  // edges: strong colour steps between neighbouring pixels (after the shared blur)
  let edge = 0;
  for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 3, l = i - 3, u = i - w * 3;
    if (Math.abs(d[i]! - d[l]!) + Math.abs(d[i + 1]! - d[l + 1]!) + Math.abs(d[i + 2]! - d[l + 2]!) + Math.abs(d[i]! - d[u]!) + Math.abs(d[i + 1]! - d[u + 1]!) + Math.abs(d[i + 2]! - d[u + 2]!) > 90) edge++;
  }
  // mirror: does the ornament mask match itself turned over about the vertical centre line?
  let same = 0, ink = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) { const a = mask[y * w + x]!, b = mask[y * w + (w - 1 - x)]!; if (a || b) { ink++; if (a && b) same++; } }
  return {
    cover: +(fg / (w * h)).toFixed(3), elements: n, levels,
    fine: +(n ? parts.filter((a) => a < med / 4).length / n : 0).toFixed(3), colors,
    edges: +(edge / (w * h)).toFixed(3), mirror: +(ink ? same / ink : 0).toFixed(3),
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

