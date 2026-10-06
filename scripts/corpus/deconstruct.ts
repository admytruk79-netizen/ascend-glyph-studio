/**
 * Pattern deconstruction: how is this pattern constructed?
 *
 *   cropPatternRegion → detectBands → findRepeatUnit
 *     → classifyFriezeGroup (bands) / classifyWallpaperGroup (fields)
 *     → detectBreaks → toGrammar → measureScaleLevels
 *
 * Works on a grayscale raster (0..255, row-major). Symmetry is tested by
 * correlating the pattern with its own flips and rotations over translations,
 * so a mirror or rotation that only holds up to a shift is still found.
 * Frieze groups use IUC short names (p1, p11m, p1m1, p11g, p2, p2mg, p2mm);
 * wallpaper results give the rotation order, mirror/glide presence and the
 * candidate groups consistent with them (mirror vs glide is not separated).
 */
import { corrAt, correlateSpectra, spectrum, type CorrelationMap, type Spectrum } from "./fft.ts";

export type Gray = { data: ArrayLike<number>; width: number; height: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Vec = [number, number];

export type Band = { orientation: "horizontal" | "vertical"; start: number; end: number; period: number; periodicity: number };
export type RepeatUnit =
  | { kind: "none"; strength: number }
  | { kind: "1d"; a: Vec; strength: number }
  | { kind: "lattice"; a: Vec; b: Vec; strength: number; latticeType: LatticeType };
export type LatticeType = "oblique" | "rectangular" | "rhombic" | "square" | "hexagonal";
export type FriezeGroup = "p1" | "p11m" | "p1m1" | "p11g" | "p2" | "p2mg" | "p2mm";
export type Frieze = { group: FriezeGroup; scores: { translation: number; vertical: number; horizontal: number; glide: number; rotation: number } };
export type Wallpaper = { rotationOrder: 1 | 2 | 3 | 4 | 6; mirrorOrGlide: boolean; candidates: string[]; scores: Record<string, number> };
export type Breaks = { segments: number; ratio: number; kinds: Record<"interruption" | "void" | "variation", number>; positions: number[] };
export type Grammar = { sequence: string; notation: string; figures: string[] };
export type Deconstruction = {
  version: string;
  kind: "frieze" | "field" | "mixed" | "single";
  crop: Box & { coverage: number };
  bands: (Band & { periodRel: number; thicknessRel: number; frieze: Frieze; breaks: Breaks; grammar: Grammar })[];
  repeat: RepeatUnit;
  wallpaper?: Wallpaper;
  fieldBreaks?: Breaks;
  rosette?: Rosette;
  scale: { stitch: number | null; motif: number | null; band: number | null; field: number };
};

export const DECONSTRUCTION_VERSION = "deconstruct/0.2";
const r3 = (v: number) => Math.round(v * 1000) / 1000;

// ---------- raster helpers ----------

export function toFloat(g: Gray): Float64Array {
  const o = new Float64Array(g.width * g.height);
  for (let i = 0; i < o.length; i++) o[i] = g.data[i]! / 255;
  return o;
}

function crop(f: Float64Array, w: number, b: Box): Float64Array {
  const o = new Float64Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) o[y * b.w + x] = f[(b.y + y) * w + b.x + x]!;
  return o;
}

/** Area-average downscale so the longer side is at most `max`. */
export function downscale(f: Float64Array, w: number, h: number, max: number) {
  const k = Math.max(1, Math.max(w, h) / max);
  if (k === 1) return { f, w, h };
  const W = Math.max(1, Math.round(w / k)), H = Math.max(1, Math.round(h / k)), o = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.floor(x * k), x1 = Math.min(w, Math.floor((x + 1) * k)), y0 = Math.floor(y * k), y1 = Math.min(h, Math.floor((y + 1) * k));
    let s = 0, n = 0;
    for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++) for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) { s += f[yy * w + xx]!; n++; }
    o[y * W + x] = s / n;
  }
  return { f: o, w: W, h: H };
}

const flipX = (f: Float64Array, w: number, h: number) => { const o = new Float64Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = f[y * w + (w - 1 - x)]!; return o; };
const flipY = (f: Float64Array, w: number, h: number) => { const o = new Float64Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = f[(h - 1 - y) * w + x]!; return o; };
const rot180 = (f: Float64Array) => Float64Array.from(f).reverse();
const transpose = (f: Float64Array, w: number, h: number) => { const o = new Float64Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x * h + y] = f[y * w + x]!; return o; };

/** Rotate a square raster about its centre (bilinear), filling outside with the mean. */
function rotate(f: Float64Array, s: number, deg: number): Float64Array {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), m = (s - 1) / 2, o = new Float64Array(s * s);
  let mean = 0;
  for (const v of f) mean += v;
  mean /= f.length;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const sx = c * (x - m) + sn * (y - m) + m, sy = -sn * (x - m) + c * (y - m) + m;
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= s - 1 || y0 >= s - 1) { o[y * s + x] = mean; continue; }
    const fx = sx - x0, fy = sy - y0, i = y0 * s + x0;
    o[y * s + x] = f[i]! * (1 - fx) * (1 - fy) + f[i + 1]! * fx * (1 - fy) + f[i + s]! * (1 - fx) * fy + f[i + s + 1]! * fx * fy;
  }
  return o;
}

/** Keep only a centred disk so rotations compare like with like. */
function disk(f: Float64Array, s: number): Float64Array {
  let mean = 0;
  for (const v of f) mean += v;
  mean /= f.length;
  const o = Float64Array.from(f), r = s / 2, m = (s - 1) / 2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if ((x - m) ** 2 + (y - m) ** 2 > r * r) o[y * s + x] = mean;
  return o;
}

function maxCorr(c: CorrelationMap, w: number, h: number, xs: [number, number], ys: [number, number]) {
  let best = -Infinity, at: Vec = [0, 0];
  for (let dy = ys[0]; dy <= ys[1]; dy++) for (let dx = xs[0]; dx <= xs[1]; dx++) {
    if (Math.abs(dx) >= w || Math.abs(dy) >= h) continue;
    const v = corrAt(c, dx, dy, { w, h });
    if (v > best) { best = v; at = [dx, dy]; }
  }
  return { value: best === -Infinity ? 0 : best, at };
}

// ---------- 1. crop ----------

/** Bounding box of the ornamented object against a museum backdrop. */
export function cropPatternRegion(f: Float64Array, w: number, h: number): Box & { coverage: number } {
  const frame: number[] = [], m = Math.max(1, Math.round(Math.min(w, h) * 0.03));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < m || y < m || x >= w - m || y >= h - m) frame.push(f[y * w + x]!);
  frame.sort((a, b) => a - b);
  const bg = frame[Math.floor(frame.length / 2)] ?? 0;
  // Threshold adapts to backdrop noise: 3× the frame's median absolute deviation, at least 0.04.
  const dev = frame.map((v) => Math.abs(v - bg)).sort((a, b) => a - b);
  const thr = Math.max(0.04, 3 * (dev[Math.floor(dev.length / 2)] ?? 0));
  const rows = new Array(h).fill(0), cols = new Array(w).fill(0);
  let fg = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(f[y * w + x]! - bg) > thr) { rows[y]++; cols[x]++; fg++; }
  const span = (p: number[], len: number, other: number) => {
    const t = other * 0.04;
    let a = 0, b = len - 1;
    while (a < len && p[a]! <= t) a++;
    while (b > a && p[b]! <= t) b--;
    return [a, b] as const;
  };
  const [y0, y1] = span(rows, h, w), [x0, x1] = span(cols, w, h);
  const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  if (box.w < w * 0.2 || box.h < h * 0.2 || fg < w * h * 0.02) return { x: 0, y: 0, w, h, coverage: 1 };
  // Step inside the object's outline so edges and backdrop do not dominate.
  const ix = Math.round(box.w * 0.04), iy = Math.round(box.h * 0.04);
  const inner = { x: box.x + ix, y: box.y + iy, w: Math.max(8, box.w - 2 * ix), h: Math.max(8, box.h - 2 * iy) };
  return { ...inner, coverage: r3((inner.w * inner.h) / (w * h)) };
}

// ---------- 2. bands and repeat ----------

/** Period along x of a strip (rows y0..y1), from its autocorrelation. */
function stripPeriod(f: Float64Array, w: number, y0: number, y1: number) {
  const h = y1 - y0, strip = crop(f, w, { x: 0, y: y0, w, h });
  const S = spectrum(strip, w, h), c = correlateSpectra(S, S);
  let best = 0, period = 0;
  const maxShift = Math.floor(w / 2);
  const vals: number[] = [];
  for (let dx = 0; dx <= maxShift; dx++) vals.push(corrAt(c, dx, 0, { w, h }));
  for (let dx = 4; dx < maxShift; dx++) {
    const v = vals[dx]!;
    if (v > vals[dx - 1]! && v >= vals[dx + 1]! && v > best + 0.02) { best = v; period = dx; }
  }
  // Sub-pixel refinement (parabola through the peak and its neighbours).
  if (period > 0 && period < maxShift) {
    const a = vals[period - 1]!, b = vals[period]!, c = vals[period + 1]!, den = a - 2 * b + c;
    if (den < 0) period += Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den));
  }
  return { period: Math.round(period * 100) / 100, periodicity: r3(Math.max(0, best)) };
}

/** Border bands: strips of high edge energy whose content repeats along the strip. */
export function detectBands(f: Float64Array, w: number, h: number): Band[] {
  const out: Band[] = [];
  for (const orientation of ["horizontal", "vertical"] as const) {
    const g = orientation === "horizontal" ? f : transpose(f, w, h);
    const W = orientation === "horizontal" ? w : h, H = orientation === "horizontal" ? h : w;
    const energy = new Array(H).fill(0);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
      energy[y] += Math.abs(g[y * W + x + 1]! - g[y * W + x - 1]!) + Math.abs(g[(y + 1) * W + x]! - g[(y - 1) * W + x]!);
    const sm = energy.map((_, i) => (energy[i - 1] ?? energy[i]) / 4 + energy[i] / 2 + (energy[i + 1] ?? energy[i]) / 4);
    const max = Math.max(...sm), sorted = [...sm].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)]!;
    // Only look for bands when energy is concentrated in part of the field.
    if (max <= 0 || med > max * 0.6) continue;
    const thr = med + (max - med) * 0.35;
    for (let y = 0; y < H; ) {
      if (sm[y] < thr) { y++; continue; }
      let e = y;
      while (e < H && sm[e] >= thr) e++;
      const height = e - y;
      if (height >= Math.max(4, H * 0.04) && height <= H * 0.5) {
        const p = stripPeriod(g, W, y, e);
        if (p.period && p.periodicity >= 0.4 && p.period <= W / 2)
          out.push({ orientation, start: y, end: e, period: p.period, periodicity: p.periodicity });
      }
      y = e;
    }
  }
  return out.sort((a, b) => (b.end - b.start) * b.periodicity - (a.end - a.start) * a.periodicity).slice(0, 4);
}

function latticeType(a: Vec, b: Vec): LatticeType {
  const la = Math.hypot(...a), lb = Math.hypot(...b);
  const ang = (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))) * 180) / Math.PI;
  const eq = Math.abs(la - lb) / Math.max(la, lb) < 0.08, right = Math.abs(ang - 90) < 6;
  if (eq && right) return "square";
  if (eq && (Math.abs(ang - 60) < 6 || Math.abs(ang - 120) < 6)) return "hexagonal";
  if (right) return "rectangular";
  if (eq) return "rhombic";
  return "oblique";
}

/** Smallest translations that map the pattern onto itself (autocorrelation peaks). */
export function findRepeatUnit(f: Float64Array, w: number, h: number, S?: Spectrum): RepeatUnit {
  const sp = S ?? spectrum(f, w, h), c = correlateSpectra(sp, sp);
  const peaks: { v: Vec; value: number }[] = [];
  const mx = Math.floor(w / 2), my = Math.floor(h / 2);
  for (let dy = 0; dy <= my; dy++) for (let dx = -mx; dx <= mx; dx++) {
    if (dy === 0 && dx <= 0) continue;
    if (dx * dx + dy * dy < 9) continue;
    const v = corrAt(c, dx, dy, { w, h });
    if (v < 0.45) continue;
    let isMax = true;
    for (let ey = -1; ey <= 1 && isMax; ey++) for (let ex = -1; ex <= 1; ex++) {
      if (!ex && !ey) continue;
      if (corrAt(c, dx + ex, dy + ey, { w, h }) > v) { isMax = false; break; }
    }
    if (isMax) peaks.push({ v: [dx, dy], value: v });
  }
  if (!peaks.length) return { kind: "none", strength: 0 };
  // Prefer short vectors among strong peaks.
  const strongest = Math.max(...peaks.map((p) => p.value));
  const byLen = (p: { v: Vec }, q: { v: Vec }) => Math.hypot(...p.v) - Math.hypot(...q.v);
  const parallel = (u: Vec, v: Vec) => Math.abs(u[0] * v[1] - u[1] * v[0]) <= 0.34 * Math.hypot(...u) * Math.hypot(...v);
  // A pattern unchanged by tiny shifts in some direction (stripes, plain bands) is
  // continuous along it: the repeat is one-dimensional across that direction.
  const tiny = peaks.filter((p) => Math.hypot(...p.v) <= 4.5 && p.value >= strongest * 0.9).sort(byLen)[0];
  if (tiny) {
    const across = peaks.filter((p) => Math.hypot(...p.v) > 4.5 && p.value >= strongest * 0.85 && !parallel(p.v, tiny.v)).sort(byLen)[0];
    return across ? { kind: "1d", a: across.v, strength: r3(across.value) } : { kind: "none", strength: 0 };
  }
  const good = peaks.filter((p) => p.value >= strongest * 0.85).sort(byLen);
  const a = good[0]!;
  const b = good.find((p) => {
    const cross = Math.abs(a.v[0] * p.v[1] - a.v[1] * p.v[0]);
    return cross > 0.34 * Math.hypot(...a.v) * Math.hypot(...p.v);
  });
  if (!b) return { kind: "1d", a: a.v, strength: r3(a.value) };
  return { kind: "lattice", a: a.v, b: b.v, strength: r3(Math.min(a.value, b.value)), latticeType: latticeType(a.v, b.v) };
}

// ---------- 3. symmetry ----------

/** Frieze group of a horizontal strip with repeat period T. */
export function classifyFriezeGroup(strip: Float64Array, w: number, h: number, period: number): Frieze {
  const T = Math.max(2, Math.round(period));
  const S = spectrum(strip, w, h);
  const vs = (g: Float64Array) => correlateSpectra(S, spectrum(g, w, h));
  const ys: [number, number] = [-2, 2];
  const translation = maxCorr(correlateSpectra(S, S), w, h, [T - 1, T + 1], [-1, 1]).value;
  const vertical = maxCorr(vs(flipX(strip, w, h)), w, h, [-T, T], [-1, 1]).value;
  const fy = vs(flipY(strip, w, h));
  const horizontal = Math.max(maxCorr(fy, w, h, [-2, 2], ys).value, maxCorr(fy, w, h, [T - 2, T + 2], ys).value);
  const half = Math.round(T / 2);
  const glide = maxCorr(fy, w, h, [half - 2, half + 2], ys).value;
  const rotation = maxCorr(vs(rot180(strip)), w, h, [-T, T], ys).value;
  const thr = Math.max(0.5, translation * 0.85);
  const V = vertical >= thr, Hm = horizontal >= thr, G = !Hm && glide >= thr, R = rotation >= thr;
  let group: FriezeGroup = "p1";
  if (V && Hm) group = "p2mm";
  else if (V && (G || R)) group = "p2mg";
  else if (V) group = "p1m1";
  else if (Hm) group = "p11m";
  else if (G) group = "p11g";
  else if (R) group = "p2";
  return { group, scores: { translation: r3(translation), vertical: r3(vertical), horizontal: r3(horizontal), glide: r3(glide), rotation: r3(rotation) } };
}

/** Rotation order and mirror/glide presence of an all-over pattern. */
export function classifyWallpaperGroup(f: Float64Array, w: number, h: number, rep: Extract<RepeatUnit, { kind: "lattice" }>): Wallpaper {
  const s = Math.min(w, h), ox = Math.floor((w - s) / 2), oy = Math.floor((h - s) / 2);
  const sq = disk(crop(f, w, { x: ox, y: oy, w: s, h: s }), s);
  const S = spectrum(sq, s, s);
  const reach = Math.min(Math.floor(s / 3), Math.ceil(Math.max(Math.hypot(...rep.a), Math.hypot(...rep.b))));
  const win: [number, number] = [-reach, reach];
  const score = (g: Float64Array) => maxCorr(correlateSpectra(S, spectrum(g, s, s)), s, s, win, win).value;
  const base = maxCorr(correlateSpectra(S, S), s, s, [rep.a[0] - 1, rep.a[0] + 1], [rep.a[1] - 1, rep.a[1] + 1]).value;
  const thr = Math.max(0.5, base * 0.85);
  const scores: Record<string, number> = { translation: r3(base) };
  for (const n of [2, 3, 4, 6]) scores[`rot${n}`] = r3(score(disk(rotate(sq, s, 360 / n), s)));
  scores.mirrorX = r3(score(flipX(sq, s, s)));
  scores.mirrorY = r3(score(flipY(sq, s, s)));
  scores.mirrorDiag = r3(score(transpose(sq, s, s)));
  scores.mirrorAnti = r3(score(rot180(transpose(sq, s, s))));
  const has = (k: string) => (scores[k] ?? 0) >= thr;
  const lt = rep.latticeType;
  let n: Wallpaper["rotationOrder"] = 1;
  if (has("rot6") && has("rot3") && has("rot2") && lt === "hexagonal") n = 6;
  else if (has("rot4") && has("rot2") && lt === "square") n = 4;
  else if (has("rot3") && lt === "hexagonal") n = 3;
  else if (has("rot2")) n = 2;
  const mirrorOrGlide = has("mirrorX") || has("mirrorY") || has("mirrorDiag") || has("mirrorAnti");
  const centred = lt === "rhombic" || lt === "hexagonal" || lt === "square";
  const table: Record<number, [string[], string[]]> = {
    1: [["p1"], centred ? ["cm"] : ["pm", "pg"]],
    2: [["p2"], centred ? ["cmm"] : ["pmm", "pmg", "pgg"]],
    3: [["p3"], ["p3m1", "p31m"]],
    4: [["p4"], ["p4m", "p4g"]],
    6: [["p6"], ["p6m"]],
  };
  return { rotationOrder: n, mirrorOrGlide, candidates: table[n]![mirrorOrGlide ? 1 : 0], scores };
}

// ---------- breaks and grammar ----------

function ncc(a: Float64Array, b: Float64Array): number {
  let ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { ma += a[i]!; mb += b[i]!; }
  ma /= a.length; mb /= b.length;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i]! - ma, y = b[i]! - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : saa === sbb ? 1 : 0;
}
const std = (a: Float64Array) => { let m = 0; for (const v of a) m += v; m /= a.length; let s = 0; for (const v of a) s += (v - m) ** 2; return Math.sqrt(s / a.length); };

/** Split a horizontal strip into period-long segments. */
export function segmentStrip(strip: Float64Array, w: number, h: number, T: number): Float64Array[] {
  // Fractional periods: start each segment at round(k·T) so segments do not drift.
  const segs: Float64Array[] = [], len = Math.max(1, Math.round(T));
  for (let k = 0; ; k++) {
    const x = Math.round(k * T);
    if (x + len > w) break;
    segs.push(crop(strip, w, { x, y: 0, w: len, h }));
  }
  return segs;
}

/** Where a band departs from its own repeat: interruptions, voids, variations. */
export function detectBreaks(segs: Float64Array[]): Breaks {
  const kinds = { interruption: 0, void: 0, variation: 0 }, positions: number[] = [];
  if (segs.length < 2) return { segments: segs.length, ratio: 0, kinds, positions };
  const len = segs[0]!.length, tmpl = new Float64Array(len);
  for (let i = 0; i < len; i++) { const col = segs.map((s) => s[i]!).sort((a, b) => a - b); tmpl[i] = col[Math.floor(col.length / 2)]!; }
  const energies = segs.map(std), medE = [...energies].sort((a, b) => a - b)[Math.floor(energies.length / 2)]!;
  segs.forEach((s, i) => {
    if (energies[i]! < medE * 0.3) { kinds.void++; positions.push(i); return; }
    const d = 1 - ncc(s, tmpl);
    if (d > 0.5) { kinds.interruption++; positions.push(i); }
    else if (d > 0.25) { kinds.variation++; positions.push(i); }
  });
  return { segments: segs.length, ratio: r3(positions.length / segs.length), kinds, positions };
}

/** Pattern sentence in the ASCEND notation: AAA | B | AAA, ABAB, ABCBA, A → A′ → A″, [VOID]. */
export function toGrammar(segs: Float64Array[]): Grammar {
  if (!segs.length) return { sequence: "", notation: "", figures: [] };
  const energies = segs.map(std), medE = [...energies].sort((a, b) => a - b)[Math.floor(energies.length / 2)]!;
  const reps: Float64Array[] = [], labels: string[] = [];
  segs.forEach((s, i) => {
    if (energies[i]! < medE * 0.3) { labels.push("_"); return; }
    let k = reps.findIndex((r) => ncc(r, s) >= 0.7);
    if (k < 0) { reps.push(s); k = reps.length - 1; }
    labels.push(String.fromCharCode(65 + Math.min(k, 25)));
  });
  const seq = labels.join("");
  const figures = new Set<string>();
  const letters = labels.filter((l) => l !== "_"), distinct = new Set(letters);
  if (labels.includes("_")) figures.add("passage");
  if (distinct.size === 1 && !labels.includes("_")) figures.add("continuity");
  if (letters.length >= 4 && distinct.size === 2 && letters.every((l, i) => i < 2 || l === letters[i - 2]) && letters[0] !== letters[1]) figures.add("duality");
  if (letters.length >= 3 && distinct.size >= 2 && letters.join("") === [...letters].reverse().join("")) figures.add("return");
  const counts = [...distinct].map((d) => letters.filter((l) => l === d).length).sort((a, b) => b - a);
  if (distinct.size >= 2 && counts[0]! >= letters.length * 0.7) figures.add("event");
  // Development: same motif drifting steadily away from the first instance.
  if (distinct.size === 1 && segs.length >= 3) {
    const sims = segs.map((s) => ncc(segs[0]!, s));
    let down = 0;
    for (let i = 1; i < sims.length; i++) if (sims[i]! < sims[i - 1]! - 0.01) down++;
    if (down >= sims.length - 2 && sims[sims.length - 1]! < 0.9) figures.add("development");
  }
  // Notation: runs of three or more are separated with " | ".
  const runs: string[] = [];
  for (let i = 0; i < labels.length; ) {
    let j = i;
    while (j < labels.length && labels[j] === labels[i]) j++;
    const l = labels[i] === "_" ? "[VOID]" : labels[i]!;
    runs.push(l === "[VOID]" ? l : l.repeat(Math.min(j - i, 6)) + (j - i > 6 ? "…" : ""));
    i = j;
  }
  const notation = figures.has("development") ? "A → A′ → A″" : runs.some((r) => r.length >= 3) ? runs.join(" | ") : runs.join("");
  return { sequence: seq, notation, figures: [...figures] };
}

// ---------- scale ----------

export function measureScaleLevels(f: Float64Array, w: number, h: number, rep: RepeatUnit, bands: Band[]) {
  const L = Math.max(w, h);
  // Finest periodicity (stitch/particle): first short-range autocorrelation peak along x.
  let mean = 0;
  for (const v of f) mean += v;
  mean /= f.length;
  let variance = 0;
  for (const v of f) variance += (v - mean) ** 2;
  variance /= f.length;
  const ac: number[] = [];
  for (let d = 1; d <= Math.min(12, Math.floor(w / 4)); d++) {
    let s = 0, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x + d < w; x++) { s += (f[y * w + x]! - mean) * (f[y * w + x + d]! - mean); n++; }
    ac[d] = variance ? s / n / variance : 0;
  }
  let stitch: number | null = null;
  for (let d = 2; d < ac.length - 1; d++) if (ac[d]! > 0.3 && ac[d]! > ac[d - 1]! && ac[d]! >= ac[d + 1]!) { stitch = d; break; }
  const motif = rep.kind === "none" ? null : Math.hypot(...rep.a);
  const band = bands.length ? Math.max(...bands.map((b) => b.end - b.start)) : null;
  return { stitch: stitch === null ? null : r3(stitch / L), motif: motif === null ? null : r3(motif / L), band: band === null ? null : r3(band / L), field: 1 };
}

// ---------- rosettes (single motifs) ----------

export type Rosette = { group: string; order: number; mirror: boolean; scores: Record<string, number> };

/**
 * Point symmetry of a single motif (Leonardo's theorem: cyclic Cn or dihedral Dn).
 * The centre is the edge-energy centroid; rotations and mirrors are compared
 * with small shifts allowed for centring error.
 */
export function classifyRosette(f: Float64Array, w: number, h: number): Rosette {
  let sx = 0, sy = 0, se = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const e = Math.abs(f[y * w + x + 1]! - f[y * w + x - 1]!) + Math.abs(f[(y + 1) * w + x]! - f[(y - 1) * w + x]!);
    sx += e * x; sy += e * y; se += e;
  }
  const cx = se ? sx / se : w / 2, cy = se ? sy / se : h / 2;
  const half = Math.floor(Math.min(cx, cy, w - 1 - cx, h - 1 - cy, Math.min(w, h) / 2));
  const scores: Record<string, number> = {};
  if (half < 8) return { group: "C1", order: 1, mirror: false, scores };
  const s = 2 * half, sq = disk(crop(f, w, { x: Math.round(cx - half), y: Math.round(cy - half), w: s, h: s }), s);
  const S = spectrum(sq, s, s), win: [number, number] = [-2, 2];
  const score = (g: Float64Array) => maxCorr(correlateSpectra(S, spectrum(disk(g, s), s, s)), s, s, win, win).value;
  const orders = [12, 8, 6, 5, 4, 3, 2];
  for (const n of orders) scores[`rot${n}`] = r3(score(rotate(sq, s, 360 / n)));
  // Mirror about an axis at angle θ = rotate(flipX, 2θ); try axes every 7.5°.
  let mirror = 0;
  const fx = flipX(sq, s, s);
  for (let t = 0; t < 180; t += 7.5) mirror = Math.max(mirror, score(t ? rotate(fx, s, 2 * t) : fx));
  scores.mirror = r3(mirror);
  const thr = 0.6;
  let order = 1;
  for (const n of orders) if ((scores[`rot${n}`] ?? 0) >= thr) { order = n; break; }
  const hasMirror = mirror >= thr;
  return { group: `${hasMirror ? "D" : "C"}${order}`, order, mirror: hasMirror, scores };
}

// ---------- orchestration ----------

/**
 * Full deconstruction. Repeat and symmetry of the whole region run on a
 * coarse raster (≤ maxSide); bands are re-measured on the finer crop
 * (≤ bandSide) so small border motifs keep their detail.
 */
export function deconstruct(g: Gray, maxSide = 128, bandSide = 512): Deconstruction {
  const full = toFloat(g);
  const box = cropPatternRegion(full, g.width, g.height);
  const hi = downscale(crop(full, g.width, box), box.w, box.h, bandSide);
  const { f, w, h } = downscale(hi.f, hi.w, hi.h, maxSide);
  const k = hi.w / w;
  const S = spectrum(f, w, h);
  const repeat = findRepeatUnit(f, w, h, S);
  const bands = detectBands(f, w, h).map((b) => {
    const horizontal = b.orientation === "horizontal";
    const src = horizontal ? hi.f : transpose(hi.f, hi.w, hi.h);
    const W = horizontal ? hi.w : hi.h, Hh = horizontal ? hi.h : hi.w;
    const y0 = Math.max(0, Math.floor(b.start * k)), y1 = Math.min(Hh, Math.ceil(b.end * k));
    const sh = y1 - y0, strip = crop(src, W, { x: 0, y: y0, w: W, h: sh });
    const fine = stripPeriod(src, W, y0, y1);
    const period = fine.period && fine.periodicity >= 0.4 ? fine.period : b.period * k;
    const segs = segmentStrip(strip, W, sh, period);
    return {
      ...b, start: y0, end: y1, period, periodicity: fine.period ? fine.periodicity : b.periodicity,
      periodRel: r3(period / W), thicknessRel: r3(sh / Hh),
      frieze: classifyFriezeGroup(strip, W, sh, period), breaks: detectBreaks(segs), grammar: toGrammar(segs),
    };
  });
  let wallpaper: Wallpaper | undefined, fieldBreaks: Breaks | undefined;
  if (repeat.kind === "lattice") {
    wallpaper = classifyWallpaperGroup(f, w, h, repeat);
    // Field breaks: cells of a coarse grid that do not match their lattice neighbour.
    const [ax, ay] = repeat.a, cell = Math.max(6, Math.round(Math.hypot(ax, ay)));
    const positions: number[] = [], kinds = { interruption: 0, void: 0, variation: 0 };
    let i = 0, cells = 0;
    for (let y = 0; y + cell <= h; y += cell) for (let x = 0; x + cell <= w; x += cell, i++) {
      const nx = x + ax, ny = y + ay;
      if (nx < 0 || ny < 0 || nx + cell > w || ny + cell > h) continue;
      cells++;
      const d = 1 - ncc(crop(f, w, { x, y, w: cell, h: cell }), crop(f, w, { x: nx, y: ny, w: cell, h: cell }));
      if (d > 0.5) { kinds.interruption++; positions.push(i); } else if (d > 0.25) { kinds.variation++; positions.push(i); }
    }
    fieldBreaks = { segments: cells, ratio: cells ? r3(positions.length / cells) : 0, kinds, positions };
  }
  const bandArea = bands.reduce((s, b) => s + b.thicknessRel, 0);
  const kind = bands.length && repeat.kind === "lattice" && bandArea < 0.6 ? "mixed" : bands.length ? "frieze" : repeat.kind === "lattice" || repeat.kind === "1d" ? "field" : "single";
  const rosette = kind === "single" ? classifyRosette(f, w, h) : undefined;
  return {
    version: DECONSTRUCTION_VERSION, kind, crop: box, bands, repeat, wallpaper, fieldBreaks, rosette,
    scale: measureScaleLevels(f, w, h, repeat, bands.map((b) => ({ ...b, start: b.start / k, end: b.end / k }))),
  };
}
