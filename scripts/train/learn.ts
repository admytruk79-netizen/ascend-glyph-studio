/**
 * Learning from museum images (the training stage of Tesseract).
 *
 * Per image (in memory, never stored):
 *   paletteOf      → the thread colours and the ground (k-means over pixels)
 *   foreground     → embroidery/ornament pixels against the ground
 *   elements       → the separate motif elements (connected shapes), each described by
 *                    its radial outline r(θ), size, elongation, solidity, rotational order, mirror score, colour
 * Across a tradition:
 *   kmeans         → clusters of similar elements (the motif codebook)
 *   prototypeShape → each cluster's averaged outline: a learned shape that belongs to no single object
 *
 * The codebook is what the generator draws motifs from; the palettes and densities set colour and fill.
 */

export type RGB = [number, number, number];
export type Raster = { data: ArrayLike<number>; width: number; height: number }; // RGB, row-major, 3 bytes per pixel

export interface Swatch { rgb: RGB; share: number }
export interface Element {
  area: number;          // fraction of the image
  size: number;          // sqrt(area) relative to the median element of the same image (scale hierarchy)
  elong: number;         // principal axis ratio ≥ 1
  solidity: number;      // filled share of the outline's area (1 = solid blob, low = spiky / open)
  order: number;         // dominant rotational order 1–8 of the outline
  mirror: number;        // mirror score about the principal axis, 0–1
  color: RGB;
  profile: number[];     // r(θ), 64 bins, aligned to the principal axis, mean 1
}
export interface ImageLearning { palette: Swatch[]; ground: RGB; density: number; elements: Element[] }

const BINS = 64;
const d2 = (a: ArrayLike<number>, b: ArrayLike<number>) => (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2;
const lum = (c: ArrayLike<number>) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

/** Deterministic k-means over vectors (k-means++ style seeding by farthest point from a fixed start). */
export function kmeans(vs: number[][], k: number, iters = 15): { centers: number[][]; assign: number[] } {
  if (vs.length === 0) return { centers: [], assign: [] };
  k = Math.min(k, vs.length);
  const dist = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2; return s; };
  const centers: number[][] = [vs[0]!.slice()];
  const best = vs.map((v) => dist(v, centers[0]!));
  while (centers.length < k) {
    let bi = 0; for (let i = 1; i < vs.length; i++) if (best[i]! > best[bi]!) bi = i;
    centers.push(vs[bi]!.slice());
    for (let i = 0; i < vs.length; i++) best[i] = Math.min(best[i]!, dist(vs[i]!, centers[centers.length - 1]!));
  }
  let assign = new Array<number>(vs.length).fill(0);
  for (let it = 0; it < iters; it++) {
    assign = vs.map((v) => { let b = 0, bd = Infinity; centers.forEach((c, j) => { const d = dist(v, c); if (d < bd) { bd = d; b = j; } }); return b; });
    for (let j = 0; j < centers.length; j++) {
      const m = vs.filter((_, i) => assign[i] === j); if (!m.length) continue;
      centers[j] = m[0]!.map((_, q) => m.reduce((a, v) => a + v[q]!, 0) / m.length);
    }
  }
  return { centers, assign };
}

/** Thread palette: k-means over (subsampled) pixels; the largest cluster is the ground. */
export function paletteOf(img: Raster, k = 6): { palette: Swatch[]; groundIndex: number } {
  const px: number[][] = [];
  const step = Math.max(1, Math.floor((img.width * img.height) / 6000));
  for (let i = 0; i < img.width * img.height; i += step) px.push([img.data[i * 3]!, img.data[i * 3 + 1]!, img.data[i * 3 + 2]!]);
  // seed from luminance quantiles so dark and light threads both get a cluster
  px.sort((a, b) => lum(a) - lum(b));
  const seeds = Array.from({ length: k }, (_, j) => px[Math.floor(((j + 0.5) / k) * (px.length - 1))]!.slice());
  let centers = seeds, assign: number[] = [];
  for (let it = 0; it < 12; it++) {
    assign = px.map((p) => { let b = 0, bd = Infinity; centers.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); return b; });
    centers = centers.map((c, j) => { const m = px.filter((_, i) => assign[i] === j); return m.length ? [0, 1, 2].map((q) => m.reduce((a, p) => a + p[q]!, 0) / m.length) : c; });
  }
  const share = centers.map((_, j) => assign.filter((a) => a === j).length / px.length);
  const palette = centers.map((c, j) => ({ rgb: c.map(Math.round) as RGB, share: share[j]! }));
  let groundIndex = 0; palette.forEach((s, j) => { if (s.share > palette[groundIndex]!.share) groundIndex = j; });
  return { palette, groundIndex };
}

/** Foreground mask: pixels clearly away from the ground colour, closed by one pixel to join stitch texture. */
export function foreground(img: Raster, ground: RGB, threshold = 48): Uint8Array {
  const { width: w, height: h } = img, n = w * h, m = new Uint8Array(n), t2 = threshold * threshold;
  for (let i = 0; i < n; i++) m[i] = d2([img.data[i * 3]!, img.data[i * 3 + 1]!, img.data[i * 3 + 2]!], ground) > t2 ? 1 : 0;
  // closing: dilate then erode (3×3)
  const morph = (src: Uint8Array, dilate: boolean) => {
    const out = new Uint8Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx]!;
        if (dilate ? s : !s) { v = dilate ? 1 : 0; }
      }
      out[y * w + x] = v;
    }
    return out;
  };
  return morph(morph(m, true), false);
}

/** Connected shapes in the mask (4-connected), filtered to motif-sized elements. */
export function components(mask: Uint8Array, w: number, h: number, minFrac = 0.0004, maxFrac = 0.08): number[][] {
  const label = new Int32Array(w * h).fill(-1), out: number[][] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const pix: number[] = [s]; label[s] = out.length;
    for (let q = 0; q < pix.length; q++) {
      const p = pix[q]!, x = p % w, y = (p - x) / w;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = ny * w + nx; if (mask[i] && label[i] === -1) { label[i] = out.length; pix.push(i); }
      }
    }
    out.push(pix);
  }
  return out.filter((c) => c.length >= minFrac * w * h && c.length <= maxFrac * w * h);
}

/** Describe one element: aligned radial profile plus shape measures. */
export function describe(pix: number[], img: Raster): Omit<Element, "size"> {
  const w = img.width; let cx = 0, cy = 0;
  for (const p of pix) { cx += p % w; cy += Math.floor(p / w); }
  cx /= pix.length; cy /= pix.length;
  let sxx = 0, syy = 0, sxy = 0; const col = [0, 0, 0];
  for (const p of pix) { const dx = (p % w) - cx, dy = Math.floor(p / w) - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; for (let c = 0; c < 3; c++) col[c]! += img.data[p * 3 + c]!; }
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc), axis = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  // radial extent per angle bin, relative to the principal axis
  const r = new Array<number>(BINS).fill(0);
  for (const p of pix) {
    const dx = (p % w) - cx + 0.5, dy = Math.floor(p / w) - cy + 0.5, d = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx) - axis; a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const b = Math.floor((a / (2 * Math.PI)) * BINS) % BINS; if (d > r[b]!) r[b] = d;
  }
  for (let i = 0; i < BINS; i++) if (r[i] === 0) r[i] = (r[(i + BINS - 1) % BINS]! + r[(i + 1) % BINS]!) / 2; // fill empty bins
  // orient: the heavier half of the outline points to θ = 0
  const half = (s: number) => { let t = 0; for (let i = 0; i < BINS / 2; i++) t += r[(s + i - BINS / 4 + BINS) % BINS]!; return t; };
  let prof = half(0) >= half(BINS / 2) ? r : r.map((_, i) => r[(i + BINS / 2) % BINS]!);
  const mean = prof.reduce((a, v) => a + v, 0) / BINS || 1; prof = prof.map((v) => v / mean);
  // solidity: pixel area against the convex hull of the pixel squares (a star is low, a rhomb or disc high)
  const hullArea = convexHullArea(pix.flatMap((p) => { const x = p % w, y = Math.floor(p / w); return [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]] as [number, number][]; }));
  // rotational order: strongest harmonic 2..8 of r(θ); weak harmonics mean order 1
  let order = 1, bestMag = 0.08;
  for (let hm = 2; hm <= 8; hm++) {
    let re = 0, im = 0; for (let i = 0; i < BINS; i++) { re += (prof[i]! - 1) * Math.cos((2 * Math.PI * hm * i) / BINS); im += (prof[i]! - 1) * Math.sin((2 * Math.PI * hm * i) / BINS); }
    const mag = Math.hypot(re, im) / BINS; if (mag > bestMag) { bestMag = mag; order = hm; }
  }
  // mirror about the principal axis: r(θ) against r(−θ)
  let num = 0, den = 0; for (let i = 0; i < BINS; i++) { num += Math.abs(prof[i]! - prof[(BINS - i) % BINS]!); den += prof[i]!; }
  return {
    area: pix.length / (img.width * img.height), elong: Math.sqrt(l1 / l2), solidity: Math.min(1, pix.length / Math.max(1, hullArea)),
    order, mirror: Math.max(0, 1 - num / den), color: col.map((v) => Math.round(v / pix.length)) as RGB, profile: prof,
  };
}

/** Area of the convex hull of a point set (Andrew's monotone chain). */
export function convexHullArea(pts: [number, number][]): number {
  const P = [...new Map(pts.map((p) => [p[0] + "," + p[1], p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return 0;
  const cross = (o: number[], a: number[], b: number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of P) { while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...P].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let a = 0; for (let i = 0; i < hull.length; i++) { const [x1, y1] = hull[i]!, [x2, y2] = hull[(i + 1) % hull.length]!; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}

/** Everything learned from one image. */
export function learnImage(img: Raster, maxElements = 40): ImageLearning {
  const { palette, groundIndex } = paletteOf(img);
  const ground = palette[groundIndex]!.rgb;
  const mask = foreground(img, ground);
  let fg = 0; for (const v of mask) fg += v;
  const comps = components(mask, img.width, img.height).sort((a, b) => b.length - a.length).slice(0, maxElements);
  const raw = comps.map((c) => describe(c, img));
  const med = raw.length ? [...raw].sort((a, b) => a.area - b.area)[Math.floor(raw.length / 2)]!.area : 1;
  return {
    palette: palette.filter((_, j) => j !== groundIndex).sort((a, b) => b.share - a.share), ground, density: fg / (img.width * img.height),
    elements: raw.map((e) => ({ ...e, size: Math.sqrt(e.area / med) })),
  };
}

/** Clustering vector of an element: rotation-invariant Fourier magnitudes of r(θ) plus shape measures. */
export function featureOf(e: Element): number[] {
  const f: number[] = [];
  for (let hm = 1; hm <= 10; hm++) {
    let re = 0, im = 0; for (let i = 0; i < BINS; i++) { re += e.profile[i]! * Math.cos((2 * Math.PI * hm * i) / BINS); im += e.profile[i]! * Math.sin((2 * Math.PI * hm * i) / BINS); }
    f.push((Math.hypot(re, im) / BINS) * 3);
  }
  f.push(Math.log(e.elong), e.solidity, e.mirror * 0.5, Math.log(Math.max(0.2, e.size)) * 0.5);
  return f;
}

/** The averaged outline of a cluster as a closed polygon in a unit box (centred, longest side 1). */
export function prototypeShape(members: Element[], points = 48): [number, number][] {
  const mean = new Array<number>(BINS).fill(0);
  for (const e of members) for (let i = 0; i < BINS; i++) mean[i]! += e.profile[i]! / members.length;
  // light smoothing so the averaged outline stitches cleanly
  const sm = mean.map((_, i) => (mean[(i + BINS - 1) % BINS]! + 2 * mean[i]! + mean[(i + 1) % BINS]!) / 4);
  const pts: [number, number][] = [];
  for (let q = 0; q < points; q++) { const t = (q / points) * BINS, i = Math.floor(t), f = t - i, r = sm[i % BINS]! * (1 - f) + sm[(i + 1) % BINS]! * f, a = (q / points) * 2 * Math.PI; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), s = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  return pts.map(([x, y]) => [+((x - mx) / s).toFixed(4), +((y - my) / s).toFixed(4)]);
}

export const hex = (c: ArrayLike<number>) => "#" + Array.from(c).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
