/**
 * Oleksandr's signature style (pattern board, 7 Oct 2026) as Lego pieces and a layout:
 *
 *   medallion   a tall concave diamond, nested outlines (blue, teal, blue), a red core and a seed, inside a halo of
 *               small flame petals, red and blue in turn
 *   vine        a rising S-curved stem with long alternate leaves and red berry sprigs, crowned by a star-lily
 *   star-lily   six petals: three green outer, three red-gold inner, a seed
 *   snowflake   a small red six-ray star
 *   star5       a small blue five-point star
 *   fan         three leaflets from one point, blue between red
 *
 * Layout: a panel of vine columns with medallion columns between them (medallions stacked with a snowflake and a fan
 * between each), framed by star borders; and the same vocabulary as a band (stars above, a horizontal vine with
 * medallions in its bays, chevrons below). All pieces are stitchable fills, satins and runs.
 */
import { Kit, type Pt } from "./folk-rich.ts";

export type SignaturePalette = { ground: string; blue: string; teal: string; red: string; gold: string; green: string; olive: string };
export const SIGNATURE: SignaturePalette = { ground: "#f3ecdc", blue: "#2f4f9e", teal: "#3f8f9a", red: "#c23b2e", gold: "#d9a43a", green: "#5b7f3a", olive: "#8a9a3e" };

const P = (x: number, y: number): Pt => ({ x, y });
const up = -Math.PI / 2;

/** Concave diamond outline: points at top/bottom (±h) and sides (±w), sides bowed inward by `bow`. */
function concaveDiamond(cx: number, cy: number, w: number, h: number, bow = 0.22, n = Math.max(3, Math.min(10, Math.floor(Math.hypot(w, h) / 1.5)))): Pt[] {
  const corners = [P(cx, cy - h), P(cx + w, cy), P(cx, cy + h), P(cx - w, cy)];
  const pts: Pt[] = [];
  for (let s = 0; s < 4; s++) {
    const a = corners[s]!, b = corners[(s + 1) % 4]!;
    for (let i = 0; i < n; i++) {
      const t = i / n, mx = a.x + (b.x - a.x) * t, my = a.y + (b.y - a.y) * t, pull = Math.sin(Math.PI * t) * bow;
      pts.push(P(mx + (cx - mx) * pull, my + (cy - my) * pull));
    }
  }
  return pts;
}

export function medallion(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE) {
  const h = size * 0.36, w = h * 0.72;
  // halo: flame petals around the diamond, leaving the top and bottom points clear
  const halo = 12;
  for (let i = 0; i < halo; i++) {
    const a = up + ((i + 0.5) / halo) * 2 * Math.PI;
    if (Math.abs(Math.cos(a)) < 0.2) continue;
    const r = h * 1.04, len = Math.max(3.6, size * 0.13);
    k.leaf(i % 2 ? c.red : c.blue, P(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r), a, len, Math.max(0.9, len * 0.2), 0, 0.45, "halo");
  }
  // nested outlines as triple runs: satin columns would bunch into tiny stitches at the sharp points
  const ring = (s: number, color: string) => { const pts = concaveDiamond(cx, cy, w * s, h * s); k.run("ring", color, [...pts, pts[0]!]); };
  ring(1, c.blue);
  if (size >= 30) { ring(0.72, c.teal); ring(0.46, c.blue); } else ring(0.56, c.teal); // three rings only where they fit
  k.fill("core", c.red, concaveDiamond(cx, cy, w * 0.26, h * 0.26, 0.1), 45);
  if (h * 0.13 >= 1.6) k.rhomb(c.gold, cx, cy, w * 0.13, h * 0.13, "seed"); // a seed only where it can be stitched
}

export function starLily(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE) {
  for (let i = 0; i < 3; i++) { const a = up + (i - 1) * 1.05; k.leaf(c.green, P(cx, cy), a, size * 0.5, size * 0.13, 0, 0.5, "lily-out"); }
  for (let i = 0; i < 2; i++) { const a = up + (i ? 0.52 : -0.52); k.leaf(i ? c.red : c.gold, P(cx, cy), a, size * 0.36, size * 0.08, 0, 0.5, "lily-in"); }
  k.leaf(c.red, P(cx, cy), up, size * 0.42, size * 0.09, 0, 0.5, "lily-in");
  k.leaf(c.olive, P(cx, cy), Math.PI / 2, size * 0.28, size * 0.1, 0, 0.5, "lily-base");
  k.disc(c.gold, cx, cy, Math.max(0.9, size * 0.05), "lily-seed");
}

export function snowflake(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE) {
  for (let i = 0; i < 6; i++) { const a = up + (i * Math.PI) / 3; k.satin("flake", c.red, [P(cx, cy), P(cx + Math.cos(a) * size / 2, cy + Math.sin(a) * size / 2)], Math.max(1, size * 0.08)); }
  k.disc(c.red, cx, cy, Math.max(1, size * 0.1), "flake-seed");
}

export function star5(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE) {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = up + (i * Math.PI) / 5, r = i % 2 ? size * 0.2 : size / 2; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  k.fill("star5", c.blue, pts, 20);
}

export function fan(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE, a = up) {
  k.leaf(c.blue, P(cx, cy), a, size, size * 0.2, 0, 0.5, "fan");
  for (const s of [-1, 1]) k.leaf(c.red, P(cx, cy), a + s * 0.6, size * 0.8, size * 0.15, -s * 0.2, 0.5, "fan");
}

/** A rising vine from (x, yBase), `height` tall in a column `width` wide: gently S-curved stem, alternate leaves
 *  and berry sprigs sized to the column, a star-lily on top. */
export function vine(k: Kit, x: number, yBase: number, height: number, width: number, c: SignaturePalette = SIGNATURE, phase = 0) {
  const A = width * 0.1, top = height - width * 0.55, X = (t: number) => x + A * Math.sin(1.6 * Math.PI * t + phase);
  k.satin("stem", c.green, Array.from({ length: 41 }, (_, i) => P(X(i / 40), yBase - (i / 40) * top)), Math.max(1.2, width * 0.06));
  const step = width * 0.42, n = Math.floor((top - width * 0.3) / step), len = width * 0.42, half = Math.max(1.1, width * 0.075);
  for (let i = 0; i < n; i++) {
    const t = (width * 0.25 + i * step) / top, side = i % 2 ? 1 : -1, y = yBase - t * top, px = X(t);
    k.leaf(i % 3 === 2 ? c.olive : c.green, P(px, y), up + side * 0.85, len, half, -side * 0.3, 0.42, "vine-leaf");
    if (i % 3 === 1) {
      // berry sprig opposite the leaf
      const sx = px - side * width * 0.3, sy = y - width * 0.18;
      k.run("sprig", c.red, [P(px, y - 0.6), P(sx, sy)]);
      k.disc(c.red, sx, sy, Math.max(1, width * 0.05), "berry");
    }
  }
  starLily(k, X(1), yBase - top - width * 0.15, width * 0.9, c);
}

/** Panel (yoke, placket, diary cover, boot shaft): vine columns with medallion columns between, star borders left and right. */
export function signaturePanel(width: number, height: number, c: SignaturePalette = SIGNATURE, columns = 2): Kit {
  const k = new Kit("sig-");
  const border = 8, inner = width - 2 * border;
  for (const bx of [border / 2, width - border / 2]) {
    for (const x of [bx - 3, bx + 3]) k.satin("frame", c.red, [P(x, 2), P(x, height - 2)], 1);
    for (let y = 7, i = 0; y < height - 4; y += 8, i++) (i % 2 ? snowflake : star5)(k, bx, y, 5.4, c);
  }
  const cols = columns * 2 + 1, cw = inner / cols;
  for (let i = 0; i < cols; i++) {
    const x = border + cw * (i + 0.5);
    if (i % 2 === 0) vine(k, x, height - 4, height - 8, cw, c, i * 1.3);
    else {
      const step = Math.min(cw * 1.5, 46), n = Math.max(1, Math.floor((height - 10) / step));
      for (let j = 0; j < n; j++) {
        const y = 8 + step * (j + 0.5) + (height - 10 - n * step) / 2;
        medallion(k, x, y, Math.min(cw * 0.95, step * 0.8), c);
        if (j < n - 1) { snowflake(k, x, y + step / 2 - 2, 4.5, c); fan(k, x, y + step / 2 + 5, 5, c, Math.PI / 2); }
      }
    }
  }
  k.resolveGaps();
  return k;
}

/** Band (cuff, hem, collar): a star row above, chevrons below, and between them medallions threaded on a vine, each
 *  pair joined by an S-scroll of stem with leaves and a berry, as along the foot of the pattern board. */
export function signatureBand(length: number, height: number, c: SignaturePalette = SIGNATURE): Kit {
  const k = new Kit("sigb-");
  const top = 7, bottom = height - 6, mid = (top + bottom) / 2, inner = bottom - top;
  for (let x = 4, i = 0; x < length; x += 8, i++) (i % 2 ? snowflake : star5)(k, x, 3.4, 5, c);
  for (let x = 0; x < length; x += 6) { k.satin("chev", c.red, [P(x, bottom + 3), P(x + 3, bottom)], 1); k.satin("chev", c.blue, [P(x + 3, bottom), P(x + 6, bottom + 3)], 1); }
  const size = inner * 0.88, mw = size * 0.36 * 0.72 * 1.5; // medallion width with its halo
  const units = Math.max(2, Math.round(length / (size * 1.9))), U = length / units;
  for (let u = 0; u < units; u++) {
    const cx = u * U + U / 2;
    medallion(k, cx, mid, size, c);
    // scroll from this medallion to the next: one S of stem, leaves on its outer curves, a berry in each bay
    const x0 = cx + mw / 2 + 3, x1 = cx + U - mw / 2 - 3, A = inner * 0.2;
    const Y = (t: number) => mid - A * Math.sin(2 * Math.PI * t);
    const stem = Array.from({ length: 33 }, (_, i) => P(x0 + (x1 - x0) * (i / 32), Y(i / 32)));
    // the last scroll runs past the band's end and continues from its start (the band closes into a ring)
    const pieces = [stem.filter((p) => p.x <= length), stem.filter((p) => p.x > length).map((p) => P(p.x - length, p.y))].filter((q) => q.length > 1);
    for (const q of pieces) k.satin("scroll", c.green, q, 1.4);
    const wrap = (x: number) => (x > length ? x - length : x);
    for (const [t, s] of [[0.2, -1], [0.45, -1], [0.55, 1], [0.8, 1]] as const) {
      const x = wrap(x0 + (x1 - x0) * t), y = Y(t);
      k.leaf(t < 0.5 ? c.green : c.olive, P(x, y), s < 0 ? up - 0.5 : -up + 0.5, inner * 0.3, Math.max(1.1, inner * 0.055), 0.3 * s, 0.42, "scroll-leaf");
    }
    for (const t of [0.25, 0.75]) k.disc(c.red, wrap(x0 + (x1 - x0) * t), Y(t) + (t < 0.5 ? 1 : -1) * inner * 0.32, Math.max(1, inner * 0.04), "berry");
  }
  k.resolveGaps();
  return k;
}
