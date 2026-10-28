/**
 * Image → counted grid, for charts and flat photographs of counted work. Images are read in memory only.
 *  1. stitch pitch: the strongest repeat (autocorrelation) of horizontal and vertical edge energy;
 *  2. phase: the offset that puts cell borders on the edge peaks;
 *  3. colour: the median of each cell's central half, clustered (k-means) and snapped to the nearest thread;
 *     the cluster that dominates the image border is bare ground.
 * Returns null (fail closed) when no clear pitch is found, or when thread colours are not clearly separated from each
 * other and from the ground (photographs of worn cloth, printed text, shading). Colours close to the ground colour
 * (lighting, folds, paper tone) count as ground.
 */
import { crop, THREAD_HEX, THREADS, type Grid } from "./grid.ts";

export interface Pixels { width: number; height: number; data: Uint8Array | Uint8ClampedArray; channels?: 3 | 4 }

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const D2 = (a: number[], b: number[]) => (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2;

function period(profile: number[], min = 4, max = 64): { p: number; strength: number } {
  const n = profile.length, m = profile.reduce((a, b) => a + b, 0) / n, v = profile.map((x) => x - m);
  const ac = (lag: number) => { let s = 0; for (let i = 0; i + lag < n; i++) s += v[i]! * v[i + lag]!; return s / (n - lag); };
  const zero = ac(0) || 1;
  // the fundamental: the shortest local peak nearly as strong as the strongest (multiples of the pitch also peak)
  const lags: { p: number; strength: number }[] = [];
  for (let lag = min; lag <= Math.min(max, n >> 2); lag++) lags.push({ p: lag, strength: ac(lag) / zero });
  // interior peaks only: a correlation still falling at the shortest lag is blur or weave, not a stitch repeat
  const peaks = lags.filter((l, i) => i > 0 && i < lags.length - 1 && l.strength > 0 && l.strength > lags[i - 1]!.strength && l.strength >= lags[i + 1]!.strength);
  const top = Math.max(0, ...peaks.map((l) => l.strength));
  return peaks.find((l) => l.strength >= 0.8 * top) ?? { p: 0, strength: 0 };
}
function phase(profile: number[], p: number) {
  let best = 0, bestS = -Infinity;
  for (let o = 0; o < p; o++) { let s = 0; for (let i = o; i < profile.length; i += p) s += profile[i]!; if (s > bestS) { bestS = s; best = o; } }
  return best;
}

export function extractGrid(img: Pixels, o: { maxColours?: number; minConfidence?: number; minSeparation?: number; groundTolerance?: number } = {}): { grid: Grid; pitch: [number, number]; confidence: number; separation: number } | null {
  const { width: W, height: H, data } = img, ch = img.channels ?? 4, maxColours = o.maxColours ?? 6;
  const px = (x: number, y: number) => { const i = (y * W + x) * ch; return [data[i]!, data[i + 1]!, data[i + 2]!]; };
  const lum = (x: number, y: number) => { const [r, g, b] = px(x, y); return 0.299 * r! + 0.587 * g! + 0.114 * b!; };
  const colE = new Array(W).fill(0), rowE = new Array(H).fill(0);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { const l = lum(x, y); colE[x] += Math.abs(l - lum(x - 1, y)); rowE[y] += Math.abs(l - lum(x, y - 1)); }
  const hx = period(colE), hy = period(rowE), confidence = Math.min(hx.strength, hy.strength);
  if (!hx.p || !hy.p || confidence < (o.minConfidence ?? 0.2)) return null;
  const ox = phase(colE, hx.p), oy = phase(rowE, hy.p);
  const gw = Math.floor((W - ox) / hx.p), gh = Math.floor((H - oy) / hy.p);
  const samples: number[][] = [];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const vals: number[][] = [];
    for (let y = Math.floor(hy.p * 0.25); y < Math.ceil(hy.p * 0.75); y++) for (let x = Math.floor(hx.p * 0.25); x < Math.ceil(hx.p * 0.75); x++) vals.push(px(ox + gx * hx.p + x, oy + gy * hy.p + y));
    samples.push([0, 1, 2].map((c) => vals.map((v) => v[c]!).sort((a, b) => a - b)[vals.length >> 1]!));
  }
  // k-means, seeded deterministically: the border colour first, then repeatedly the sample farthest from every centre
  const borderSamples = samples.filter((_, k) => { const gx = k % gw, gy = (k - gx) / gw; return !gx || !gy || gx === gw - 1 || gy === gh - 1; });
  let centres = [[0, 1, 2].map((c) => borderSamples.map((v) => v[c]!).sort((a, b) => a - b)[borderSamples.length >> 1] ?? 255)];
  while (centres.length < maxColours) {
    let far = samples[0]!, farD = -1;
    for (const s of samples) { const d = Math.min(...centres.map((c) => D2(s, c))); if (d > farD) { farD = d; far = s; } }
    if (farD < 35 * 35) break;
    centres.push(far.slice());
  }
  let assign: number[] = [];
  for (let it = 0; it < 12; it++) {
    assign = samples.map((s) => centres.reduce((b, c, i) => (D2(s, c) < D2(s, centres[b]!) ? i : b), 0));
    centres = centres.map((c, i) => { const m = samples.filter((_, k) => assign[k] === i); return m.length ? [0, 1, 2].map((d) => m.reduce((a, v) => a + v[d]!, 0) / m.length) : c; });
  }
  const border = new Array(centres.length).fill(0), size = new Array(centres.length).fill(0);
  assign.forEach((a) => size[a]++);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) if (!gx || !gy || gx === gw - 1 || gy === gh - 1) border[assign[gy * gw + gx]!]++;
  const ground = border.indexOf(Math.max(...border)), G = centres[ground]!;
  // shading of the same cloth or paper (lighting, folds, foxing) is ground too: anything close to the ground colour
  const isGround = centres.map((c, i) => i === ground || Math.sqrt(D2(c, G)) < (o.groundTolerance ?? 70));
  // separation: threads must be clearly apart from each other and from the ground, relative to the spread inside a colour
  const used = centres.map((_, i) => i).filter((i) => size[i]! > 0);
  let within = 0, n = 0;
  samples.forEach((s, k) => { within += Math.sqrt(D2(s, centres[assign[k]!]!)); n++; });
  within /= Math.max(1, n);
  let between = Infinity;
  for (const i of used) for (const j of used) if (i < j && !(isGround[i] && isGround[j])) between = Math.min(between, Math.sqrt(D2(centres[i]!, centres[j]!)));
  const separation = between === Infinity ? 0 : between / (2 * within + 1);
  if (separation < (o.minSeparation ?? 1.2)) return null;
  const palette = THREADS.slice(1).map((t) => hexRgb(THREAD_HEX[t]));
  const threadOf = centres.map((c, i) => (isGround[i] ? 0 : 1 + palette.reduce((b, p, k) => (D2(c, p) < D2(c, palette[b]!) ? k : b), 0)));
  const grid = crop({ w: gw, h: gh, cells: assign.map((a) => threadOf[a]!) });
  if (!grid.w) return null;
  return { grid, pitch: [hx.p, hy.p], confidence, separation };
}

/** Render a grid as an RGB image with stitch texture and seams (for tests and previews). */
export function renderPixels(g: Grid, cell = 9, noise = 0, seed = 1, o: { ground?: string; gradient?: number } = {}): Pixels {
  const W = g.w * cell + 2 * cell, H = g.h * cell + 2 * cell, data = new Uint8Array(W * H * 3);
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5) * 2 * noise;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = Math.floor(x / cell) - 1, gy = Math.floor(y / cell) - 1;
    const t = gx >= 0 && gy >= 0 && gx < g.w && gy < g.h ? g.cells[gy * g.w + gx]! : 0;
    const rgb = hexRgb(t ? THREAD_HEX[THREADS[t]!] : o.ground ?? THREAD_HEX["."]), seam = x % cell === 0 || y % cell === 0 ? 0.72 : 1, light = 1 - (o.gradient ?? 0) * (x / W);
    for (let c = 0; c < 3; c++) data[(y * W + x) * 3 + c] = Math.max(0, Math.min(255, Math.round(rgb[c]! * seam * light + rnd())));
  }
  return { width: W, height: H, data, channels: 3 };
}
