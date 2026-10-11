/**
 * Minimal radix-2 FFT and FFT-based 2D correlation for pattern analysis.
 * Sizes are padded to powers of two; all arrays are row-major.
 */

export const nextPow2 = (n: number) => 1 << Math.ceil(Math.log2(Math.max(1, n)));

/** In-place iterative radix-2 FFT. `inverse` computes the unnormalized inverse. */
export function fft1d(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci, ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr; im[b] = im[a]! - ti;
        re[a] = re[a]! + tr; im[a] = im[a]! + ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

export function fft2d(re: Float64Array, im: Float64Array, w: number, h: number, inverse = false): void {
  const rr = new Float64Array(w), ri = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) { rr[x] = re[y * w + x]!; ri[x] = im[y * w + x]!; }
    fft1d(rr, ri, inverse);
    for (let x = 0; x < w; x++) { re[y * w + x] = rr[x]!; im[y * w + x] = ri[x]!; }
  }
  const cr = new Float64Array(h), ci = new Float64Array(h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) { cr[y] = re[y * w + x]!; ci[y] = im[y * w + x]!; }
    fft1d(cr, ci, inverse);
    for (let y = 0; y < h; y++) { re[y * w + x] = cr[y]!; im[y * w + x] = ci[y]!; }
  }
}

/** Zero-mean, unit-norm copy (NaN-safe for flat inputs). */
export function normalize(a: ArrayLike<number>): Float64Array {
  const n = a.length, o = new Float64Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) m += a[i]!;
  m /= n || 1;
  let ss = 0;
  for (let i = 0; i < n; i++) { o[i] = a[i]! - m; ss += o[i]! * o[i]!; }
  const s = Math.sqrt(ss) || 1;
  for (let i = 0; i < n; i++) o[i] = o[i]! / s;
  return o;
}

export type CorrelationMap = { data: Float64Array; w: number; h: number };

export type Spectrum = { re: Float64Array; im: Float64Array; W: number; H: number; w: number; h: number };

/** Zero-padded spectrum of a normalized image, reusable across many correlations. */
export function spectrum(a: ArrayLike<number>, w: number, h: number): Spectrum {
  const W = nextPow2(2 * w), H = nextPow2(2 * h), na = normalize(a);
  const re = new Float64Array(W * H), im = new Float64Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) re[y * W + x] = na[y * w + x]!;
  fft2d(re, im, W, H);
  return { re, im, W, H, w, h };
}

/**
 * Cross-correlation of two spectra of equally sized images over all shifts
 * (zero padded, no wrap-around): r(dx, dy) = Σ a(x+dx, y+dy)·b(x, y).
 * Values shrink with the overlap area; pass `overlap` to `corrAt` to compensate.
 */
export function correlateSpectra(A: Spectrum, B: Spectrum): CorrelationMap {
  const { W, H } = A, re = new Float64Array(W * H), im = new Float64Array(W * H);
  // a ⋆ b = IFFT(A · conj(B))
  for (let i = 0; i < W * H; i++) {
    re[i] = A.re[i]! * B.re[i]! + A.im[i]! * B.im[i]!;
    im[i] = A.im[i]! * B.re[i]! - A.re[i]! * B.im[i]!;
  }
  fft2d(re, im, W, H, true);
  for (let i = 0; i < W * H; i++) re[i] = re[i]! / (W * H);
  return { data: re, w: W, h: H };
}

export function crossCorrelate(a: ArrayLike<number>, b: ArrayLike<number>, w: number, h: number): CorrelationMap {
  return correlateSpectra(spectrum(a, w, h), spectrum(b, w, h));
}

/**
 * Correlation value for shift (dx, dy). With `overlap`, the value is divided by
 * the overlapping fraction of an image of size (w, h), approximating the
 * normalized correlation of the overlapping parts.
 */
export function corrAt(c: CorrelationMap, dx: number, dy: number, overlap?: { w: number; h: number }): number {
  const v = c.data[(((dy % c.h) + c.h) % c.h) * c.w + (((dx % c.w) + c.w) % c.w)]!;
  if (!overlap) return v;
  const f = ((overlap.w - Math.abs(dx)) * (overlap.h - Math.abs(dy))) / (overlap.w * overlap.h);
  return f > 0 ? v / f : 0;
}
