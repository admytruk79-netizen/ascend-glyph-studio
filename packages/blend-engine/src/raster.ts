/** Even–odd scanline fill of polygons into a greyscale image (0 = ink, 1 = ground) for self-checks. */
import type { Poly } from "./motifs.js";

export function rasterize(polys: Poly[], w: number, h: number, scale: number, ox = 0, oy = 0): Float64Array {
  const img = new Float64Array(w * h).fill(1);
  for (let y = 0; y < h; y++) {
    const yy = (y + 0.5) / scale + oy;
    const xs: number[] = [];
    for (const p of polys)
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i]!, b = p[j]!;
        if ((a.y > yy) !== (b.y > yy)) xs.push(((a.x + ((yy - a.y) * (b.x - a.x)) / (b.y - a.y)) - ox) * scale);
      }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xs[k]! - 0.5)), x1 = Math.min(w - 1, Math.floor(xs[k + 1]! - 0.5));
      for (let x = x0; x <= x1; x++) img[y * w + x] = 0;
    }
  }
  return img;
}
