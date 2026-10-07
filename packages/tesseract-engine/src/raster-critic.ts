/**
 * Raster critic: judges the rendered design, not its SVG source text.
 *
 * The SVG critic (final-svg-critic.ts) counts path commands, transforms and opacity attributes; it cannot
 * see that six overlaid copies of a drawing form an illegible tangle, and opacity means nothing in thread.
 * This critic rasterises the final SVG and measures what an eye (and an embroidery machine) meets:
 *   coverage      share of the field carrying ink/thread
 *   clutter       share of the ink in tangle cells: crowded with thin crossing lines (solid fills are not tangles)
 *   emptyColumns  share of the band's length with no ornament at all
 *   balance       how evenly the ornament spreads along the length (1 = even)
 * For embroidery every visible layer is stitched at full density, so translucency is treated as full ink.
 */

export type RasterCritique = {
  coverage: number; clutter: number; emptyColumns: number; balance: number;
  quality: number; survive: boolean; flags: string[];
};

export type RasterLimits = { minCoverage: number; maxCoverage: number; maxClutter: number; maxEmptyColumns: number; denseCell: number };
export const EMBROIDERY_LIMITS: RasterLimits = { minCoverage: 0.04, maxCoverage: 0.45, maxClutter: 0.2, maxEmptyColumns: 0.35, denseCell: 0.3 };

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function qualityOf(coverage: number, clutter: number, empty: number, balance: number, limits = EMBROIDERY_LIMITS): number {
  return clamp(
    (1 - clamp(clutter / (limits.maxClutter * 2))) * 0.45 +
    (1 - clamp(empty / (limits.maxEmptyColumns * 2))) * 0.2 +
    balance * 0.2 +
    (coverage >= limits.minCoverage && coverage <= limits.maxCoverage ? 0.15 : 0),
  );
}

/** Pure measurement on an RGB raster with a known ground colour (testable without an SVG renderer). */
export function measureRaster(rgb: ArrayLike<number>, width: number, height: number, ground: [number, number, number], limits = EMBROIDERY_LIMITS, cell = 10): RasterCritique {
  const ink = new Uint8Array(width * height);
  let inkCount = 0;
  for (let i = 0; i < width * height; i++) {
    const d = Math.hypot(rgb[i * 3]! - ground[0], rgb[i * 3 + 1]! - ground[1], rgb[i * 3 + 2]! - ground[2]);
    // a faint (translucent) line is still a full line of thread, so the threshold is low
    if (d > 24) { ink[i] = 1; inkCount++; }
  }
  const gx = Math.ceil(width / cell), gy = Math.ceil(height / cell);
  const cellInk = new Float64Array(gx * gy), cellArea = new Float64Array(gx * gy);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const c = Math.floor(y / cell) * gx + Math.floor(x / cell); cellArea[c]!++; if (ink[y * width + x]) cellInk[c]!++; }
  // a tangle is a crowded cell made of thin crossing lines: most of its ink is edge. A solid embroidered
  // fill is just as full of ink but mostly interior, so it is not a tangle.
  const cellEdge = new Float64Array(gx * gy);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x; if (!ink[i]) continue;
    const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1 || !ink[i - 1] || !ink[i + 1] || !ink[i - width] || !ink[i + width];
    if (edge) cellEdge[Math.floor(y / cell) * gx + Math.floor(x / cell)]!++;
  }
  let denseInk = 0;
  for (let c = 0; c < gx * gy; c++) if (cellInk[c]! / cellArea[c]! > limits.denseCell && cellEdge[c]! / Math.max(1, cellInk[c]!) > 0.6) denseInk += cellInk[c]!;
  // columns along the length (bands run horizontally)
  const colInk = new Float64Array(gx);
  for (let c = 0; c < gx * gy; c++) colInk[c % gx]! += cellInk[c]!;
  const colShare = Array.from(colInk, (v) => v / (cell * height));
  const empty = colShare.filter((v) => v < 0.004).length / gx;
  const mean = colShare.reduce((a, v) => a + v, 0) / gx || 1e-9;
  const cv = Math.sqrt(colShare.reduce((a, v) => a + (v - mean) ** 2, 0) / gx) / mean;
  const coverage = inkCount / (width * height), clutter = inkCount ? denseInk / inkCount : 0, balance = clamp(1 - cv / 2);
  const flags: string[] = [];
  if (coverage < limits.minCoverage) flags.push("raster-too-sparse");
  if (coverage > limits.maxCoverage) flags.push("raster-overfilled");
  if (clutter > limits.maxClutter) flags.push("raster-tangle");
  if (empty > limits.maxEmptyColumns) flags.push("raster-unused-field");
  const quality = qualityOf(coverage, clutter, empty, balance, limits);
  return { coverage, clutter, emptyColumns: empty, balance, quality, survive: flags.length === 0, flags };
}

/** Ground colour: the first full-size rect fill, else the most common border colour. */
function groundOf(svg: string, rgb: ArrayLike<number>, w: number, h: number): [number, number, number] {
  const m = svg.match(/<rect[^>]*width="100%"[^>]*fill="#([0-9a-fA-F]{6})"/) ?? svg.match(/<rect[^>]*fill="#([0-9a-fA-F]{6})"[^>]*width="100%"/);
  if (m) { const n = parseInt(m[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const counts = new Map<number, number>();
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = (y * w + x) * 3, k = (rgb[i]! << 16) | (rgb[i + 1]! << 8) | rgb[i + 2]!; counts.set(k, (counts.get(k) ?? 0) + 1); }
  const k = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0xffffff;
  return [(k >> 16) & 255, (k >> 8) & 255, k & 255];
}

/**
 * Overdraw: how many separately drawn elements stack on each spot. Every element is drawn as an equally faint
 * black mark (opacity A) on white, so darkness d after n layers is 1 − (1 − A)^n and n is read back per pixel.
 * A tangle stacks many crossing strokes; an embroidered motif stacks at most two or three by design
 * (a seed laid on a petal), so overlap stays a small share of the ink. `deep` is the share of inked pixels
 * covered by two or more separate elements; calibrated on the corpus: clean embroidery bands 0.03–0.08,
 * stacked master compositions 0.3–0.8.
 */
const A = 0.25;
export function overdrawFromGray(gray: ArrayLike<number>, n: number): { ink: number; deep: number; depthShare: (k: number) => number } {
  const depths: number[] = [];
  for (let i = 0; i < n; i++) { const d = Math.min(0.995, 1 - gray[i]! / 255); if (d > 0.12) depths.push(Math.log(1 - d) / Math.log(1 - A)); }
  const share = (k: number) => (depths.length ? depths.filter((x) => x >= k - 0.5).length / depths.length : 0);
  return { ink: depths.length / n, deep: share(2), depthShare: share };
}

function toOverdrawSvg(svg: string): string {
  return svg
    .replace(/<rect[^>]*width="100%"[^>]*\/>/, "")                    // drop the ground
    .replace(/\s(?:stroke-|fill-)?opacity="[^"]*"/g, "")                // thread has no translucency
    .replace(/(\s(?:stroke|fill))="(?!none)[^"]*"/g, '$1="#000"')       // every mark the same
    .replace(/(<svg[^>]*>)/, '$1<style>path,polygon,polyline,circle,ellipse,line,rect{opacity:0.25}</style>');
}

/** Rasterise the final SVG (sharp/librsvg) and measure it. Translucent layers are made opaque first. */
export async function critiqueRaster(svg: string, limits = EMBROIDERY_LIMITS, width = 480): Promise<RasterCritique & { overdraw: number }> {
  const { default: sharp } = await import("sharp");
  const opaque = svg.replace(/\s(?:stroke-)?opacity="[^"]*"/g, "");
  const { data, info } = await sharp(Buffer.from(opaque), { density: 96 }).resize({ width }).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = measureRaster(data, info.width, info.height, groundOf(svg, data, info.width, info.height), limits);
  const od = await sharp(Buffer.from(toOverdrawSvg(svg)), { density: 96 }).resize({ width }).flatten({ background: "#ffffff" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { deep } = overdrawFromGray(od.data, od.info.width * od.info.height);
  // overdraw replaces the pixel-texture tangle test
  const flags = base.flags.filter((f) => f !== "raster-tangle");
  if (deep > limits.maxClutter) flags.push("raster-tangle");
  const quality = qualityOf(base.coverage, deep, base.emptyColumns, base.balance, limits);
  return { ...base, clutter: deep, overdraw: deep, quality, survive: flags.length === 0, flags };
}
