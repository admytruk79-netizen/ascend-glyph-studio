/**
 * Structural image features for the research corpus.
 *
 * The goal is to describe how a pattern is constructed — axes, repetition,
 * symmetry, radiality, density, voids, scale hierarchy — not to store or
 * reproduce the image. Input is a grayscale raster (0..255, row-major).
 */

export type Gray = { data: Uint8Array | Float32Array; width: number; height: number };

export type StructuralFeatures = {
  contrast: number;
  edgeDensity: number;
  orientation: number[];
  dominantAxis: "horizontal" | "vertical" | "diagonal" | "isotropic";
  axisStrength: number;
  mirrorX: number;
  mirrorY: number;
  rotation180: number;
  periodX: number;
  periodY: number;
  repetitionX: number;
  repetitionY: number;
  radiality: number;
  voidRatio: number;
  densityVariation: number;
  scaleHierarchy: number[];
};

const round = (v: number) => Math.round(v * 1000) / 1000;

function toFloat(g: Gray): Float32Array {
  const f = new Float32Array(g.width * g.height);
  for (let i = 0; i < f.length; i++) f[i] = (g.data[i] ?? 0) / 255;
  return f;
}

function sobel(f: Float32Array, w: number, h: number) {
  const mag = new Float32Array(w * h), ang = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = (dx: number, dy: number) => f[(y + dy) * w + x + dx]!;
    const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
    const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
    mag[y * w + x] = Math.hypot(gx, gy);
    ang[y * w + x] = Math.atan2(gy, gx);
  }
  return { mag, ang };
}

function downsample(f: Float32Array, w: number, h: number) {
  const W = Math.floor(w / 2), H = Math.floor(h / 2), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    o[y * W + x] = (f[2 * y * w + 2 * x]! + f[2 * y * w + 2 * x + 1]! + f[(2 * y + 1) * w + 2 * x]! + f[(2 * y + 1) * w + 2 * x + 1]!) / 4;
  return { f: o, w: W, h: H };
}

function similarity(f: Float32Array, w: number, h: number, map: (x: number, y: number) => number) {
  let d = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d += Math.abs(f[y * w + x]! - f[map(x, y)]!);
  return 1 - d / (w * h);
}

/** Normalized autocorrelation of a binary edge map along one axis; returns best period and its strength. */
function periodicity(e: Uint8Array, w: number, h: number, axis: "x" | "y") {
  const n = axis === "x" ? w : h, maxShift = Math.floor(n / 2);
  let total = 0;
  for (const v of e) total += v;
  if (!total) return { period: 0, strength: 0 };
  let best = 0, bestShift = 0;
  for (let s = 4; s <= maxShift; s++) {
    let match = 0, count = 0;
    for (let y = 0; y < (axis === "y" ? h - s : h); y++) for (let x = 0; x < (axis === "x" ? w - s : w); x++) {
      const a = e[y * w + x]!, b = axis === "x" ? e[y * w + x + s]! : e[(y + s) * w + x]!;
      match += a & b; count += a;
    }
    const score = count ? match / count : 0;
    if (score > best) { best = score; bestShift = s; }
  }
  return { period: round(bestShift / n), strength: round(best) };
}

export function structuralFeatures(g: Gray): StructuralFeatures {
  const { width: w, height: h } = g;
  const f = toFloat(g);
  let mean = 0;
  for (const v of f) mean += v;
  mean /= f.length;
  let variance = 0;
  for (const v of f) variance += (v - mean) ** 2;
  const contrast = Math.sqrt(variance / f.length);

  const { mag, ang } = sobel(f, w, h);
  let maxMag = 0;
  for (const v of mag) if (v > maxMag) maxMag = v;
  const thresh = Math.max(0.25, maxMag * 0.2);
  const edges = new Uint8Array(w * h);
  let edgeCount = 0;
  const orient = new Array(8).fill(0);
  let radialSum = 0, radialWeight = 0;
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, m = mag[i]!;
    if (m < thresh) continue;
    edges[i] = 1; edgeCount++;
    // Edge orientation is perpendicular to the gradient; fold to [0, π).
    let a = ang[i]! + Math.PI / 2;
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    orient[Math.min(7, Math.floor((a / Math.PI) * 8))] += m;
    const rx = x - cx, ry = y - cy, r = Math.hypot(rx, ry);
    if (r > 2) {
      // Gradient aligned with the radius means edges run tangentially (rings); across it means rays.
      const cos = Math.abs((Math.cos(ang[i]!) * rx + Math.sin(ang[i]!) * ry) / r);
      radialSum += m * (1 - cos); radialWeight += m;
    }
  }
  const oTotal = orient.reduce((s, v) => s + v, 0) || 1;
  const orientation = orient.map((v) => round(v / oTotal));
  const horiz = orientation[0]! + orientation[7]!, vert = orientation[3]! + orientation[4]!;
  const diag = orientation[1]! + orientation[2]! + orientation[5]! + orientation[6]!;
  const axisStrength = Math.max(horiz, vert, diag / 2) - 0.25;
  const dominantAxis = axisStrength < 0.1 ? "isotropic" : horiz >= vert && horiz >= diag / 2 ? "horizontal" : vert >= diag / 2 ? "vertical" : "diagonal";

  const px = periodicity(edges, w, h, "x"), py = periodicity(edges, w, h, "y");

  const cell = 8, gw = Math.floor(w / cell), gh = Math.floor(h / cell), dens: number[] = [];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let c = 0;
    for (let y = gy * cell; y < (gy + 1) * cell; y++) for (let x = gx * cell; x < (gx + 1) * cell; x++) c += edges[y * w + x]!;
    dens.push(c / (cell * cell));
  }
  const dMean = dens.reduce((s, v) => s + v, 0) / (dens.length || 1);
  const dStd = Math.sqrt(dens.reduce((s, v) => s + (v - dMean) ** 2, 0) / (dens.length || 1));

  const scales: number[] = [];
  let cur = { f, w, h };
  for (let k = 0; k < 3 && cur.w >= 16 && cur.h >= 16; k++) {
    const s = sobel(cur.f, cur.w, cur.h).mag;
    scales.push(s.reduce((a, v) => a + v, 0) / s.length);
    cur = downsample(cur.f, cur.w, cur.h);
  }
  const s0 = scales[0] || 1;

  return {
    contrast: round(contrast),
    edgeDensity: round(edgeCount / (w * h)),
    orientation,
    dominantAxis,
    axisStrength: round(Math.max(0, axisStrength)),
    mirrorX: round(similarity(f, w, h, (x, y) => y * w + (w - 1 - x))),
    mirrorY: round(similarity(f, w, h, (x, y) => (h - 1 - y) * w + x)),
    rotation180: round(similarity(f, w, h, (x, y) => (h - 1 - y) * w + (w - 1 - x))),
    periodX: px.period, periodY: py.period, repetitionX: px.strength, repetitionY: py.strength,
    radiality: round(radialWeight ? radialSum / radialWeight : 0),
    voidRatio: round(dens.filter((v) => v < 0.02).length / (dens.length || 1)),
    densityVariation: round(dMean ? dStd / dMean : 0),
    scaleHierarchy: scales.map((v) => round(v / s0)),
  };
}

const toHex = (bits: string) => {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
};

/** 64-bit horizontal difference hash from a 9x8 grayscale raster, as 16 hex chars. */
export function dHash(g: Gray): string {
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += (g.data[y * 9 + x]! > g.data[y * 9 + x + 1]! ? "1" : "0");
  return toHex(bits);
}

/** 64-bit vertical difference hash from an 8x9 grayscale raster, as 16 hex chars. */
export function dHashVertical(g: Gray): string {
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += (g.data[y * 8 + x]! > g.data[(y + 1) * 8 + x]! ? "1" : "0");
  return toHex(bits);
}

const POP = Array.from({ length: 16 }, (_, i) => i.toString(2).split("1").length - 1);
export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += POP[parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16)]!;
  return d;
}

/**
 * Near-duplicate index over hex hashes. Splits each hash into 16-bit bands;
 * any two hashes within distance (bands - 1) share at least one band exactly,
 * so maxDistance must stay below the band count.
 */
export class NearDuplicateIndex {
  private bands: Map<string, string[]>[] = [];
  constructor(private maxDistance = 3) {}
  findOrAdd(hash: string): string | undefined {
    const n = hash.length / 4;
    if (this.maxDistance >= n) throw new Error("maxDistance must be below the band count");
    while (this.bands.length < n) this.bands.push(new Map());
    for (let b = 0; b < n; b++) {
      for (const other of this.bands[b]!.get(hash.slice(b * 4, b * 4 + 4)) ?? [])
        if (hamming(hash, other) <= this.maxDistance) return other;
    }
    for (let b = 0; b < n; b++) {
      const key = hash.slice(b * 4, b * 4 + 4), list = this.bands[b]!.get(key);
      if (list) list.push(hash); else this.bands[b]!.set(key, [hash]);
    }
    return undefined;
  }
}
