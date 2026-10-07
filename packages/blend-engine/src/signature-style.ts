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
import { densify } from "./densify.ts";
import { pointInPolygon, pointSegDist } from "../../stitch-engine/src/index.ts";

export type SignaturePalette = { ground: string; blue: string; teal: string; red: string; gold: string; green: string; olive: string };
export const SIGNATURE: SignaturePalette = { ground: "#f3ecdc", blue: "#2f4f9e", teal: "#3f8f9a", red: "#c23b2e", gold: "#d9a43a", green: "#5b7f3a", olive: "#8a9a3e" };

const P = (x: number, y: number): Pt => ({ x, y });
const up = -Math.PI / 2;

/** Points along a closed outline at least `gap` mm apart (so a run over it never makes tiny stitches). */
function spaced(pts: Pt[], gap = 1.5): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (const q of pts.slice(1)) if (Math.hypot(q.x - out[out.length - 1]!.x, q.y - out[out.length - 1]!.y) >= gap) out.push(q);
  // close the loop without a tiny last stitch: drop the last point if it sits too near the start
  if (out.length > 2 && Math.hypot(out[out.length - 1]!.x - pts[0]!.x, out[out.length - 1]!.y - pts[0]!.y) < gap) out.pop();
  out.push(pts[0]!);
  return out;
}

/** Clearance from a point to the ink already in `k` (the last `recent` objects), in mm. */
function clearance(k: Kit, p: Pt, recent = 60): number {
  let best = Infinity;
  for (const o of k.objs.slice(-recent)) {
    if (o.kind === "fill") {
      if (pointInPolygon(p, o.polygon)) return 0;
      for (let i = 0; i < o.polygon.length; i++) best = Math.min(best, pointSegDist(p, o.polygon[i]!, o.polygon[(i + 1) % o.polygon.length]!));
    } else { const half = o.kind === "satin" ? o.width / 2 : 0.3; for (let i = 1; i < o.path.length; i++) best = Math.min(best, pointSegDist(p, o.path[i - 1]!, o.path[i]!) - half); }
  }
  return best;
}

/** A layered leaf or petal: fill, an outline in a contrasting colour, and a midrib, as the board draws them. */
export function richLeaf(k: Kit, fill: string, edge: string, vein: string, base: Pt, a: number, len: number, half: number, bend = 0, kind = "leaf") {
  k.leaf(fill, base, a, len, half, bend, 0.42, kind);
  const leaf = k.objs[k.objs.length - 1]!;
  if (len >= 7 && leaf.kind === "fill") k.run(`${kind}-edge`, edge, spaced(leaf.polygon));
  if (len >= 5) k.run(`${kind}-rib`, vein, [P(base.x + Math.cos(a) * len * 0.22, base.y + Math.sin(a) * len * 0.22), P(base.x + Math.cos(a + bend * 0.15) * len * 0.72, base.y + Math.sin(a + bend * 0.15) * len * 0.72)]);
}

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
  if (size >= 30) {
    // larger medallions: a second, outer halo of small flames between the first, and a bud beyond each point
    for (let i = 0; i < halo; i++) {
      const a = up + (i / halo) * 2 * Math.PI;
      if (Math.abs(Math.cos(a)) < 0.3) continue;
      const len = Math.max(3.2, size * 0.09);
      k.leaf(i % 2 ? c.blue : c.red, P(cx + Math.cos(a) * h * 1.05, cy + Math.sin(a) * h * 1.32), a, len, Math.max(0.9, len * 0.2), 0, 0.45, "halo-out");
    }
    for (const s of [-1, 1]) k.leaf(c.red, P(cx, cy + s * (h + 1.6)), s < 0 ? up : -up, size * 0.12, Math.max(1, size * 0.03), 0, 0.55, "point-bud");
  }
  // nested outlines as triple runs: satin columns would bunch into tiny stitches at the sharp points
  // every ring uses the outer ring's point count, so nested rings stay parallel
  const n = Math.max(3, Math.min(10, Math.floor(Math.hypot(w, h) / 1.5)));
  const ring = (s: number, color: string) => { const pts = concaveDiamond(cx, cy, w * s, h * s, 0.22, n); k.run("ring", color, [...pts, pts[0]!]); };
  // rings and core share one shape (same bow and point count), so the gaps between them stay even all round
  ring(1, c.blue);
  const inner = size >= 34 ? [0.72, 0.42] : size >= 20 ? [0.55] : [];
  inner.forEach((f, i) => ring(f, i % 2 ? c.blue : c.teal));
  const coreF = size >= 34 ? 0.2 : size >= 20 ? 0.24 : 0.42;
  k.fill("core", c.red, concaveDiamond(cx, cy, w * coreF, h * coreF, 0.22, n), 45);
  if (h * coreF * 0.45 >= 1.6) k.rhomb(c.gold, cx, cy, w * coreF * 0.4, h * coreF * 0.4, "seed"); // a seed only where it can be stitched
}

export function starLily(k: Kit, cx: number, cy: number, size: number, c: SignaturePalette = SIGNATURE) {
  for (let i = 0; i < 3; i++) { const a = up + (i - 1) * 1.05; richLeaf(k, c.green, c.blue, c.olive, P(cx, cy), a, size * 0.5, size * 0.13, 0, "lily-out"); }
  for (let i = 0; i < 2; i++) { const a = up + (i ? 0.52 : -0.52); k.leaf(i ? c.red : c.gold, P(cx, cy), a, size * 0.36, size * 0.08, 0, 0.5, "lily-in"); }
  k.leaf(c.red, P(cx, cy), up, size * 0.42, size * 0.09, 0, 0.5, "lily-in");
  k.leaf(c.olive, P(cx, cy), Math.PI / 2, size * 0.28, size * 0.1, 0, 0.5, "lily-base");
  k.disc(c.gold, cx, cy, Math.max(0.9, size * 0.05), "lily-seed");
  // two curling tendrils from the base, mirror images, each a shrinking spiral
  if (size < 16) return; // too small to curl in thread
  for (const s of [-1, 1]) {
    const ox = cx + s * size * 0.34, oy = cy - size * 0.04, dense: Pt[] = [];
    for (let i = 0; i <= 120; i++) { const t = i / 120, th = Math.PI / 2 + t * 2.6 * Math.PI, r = size * 0.15 * (1 - 0.65 * t); dense.push(P(ox + s * Math.cos(th) * r, oy - Math.sin(th) * r)); }
    // keep points at least 1.5 mm apart, so every stitch of the curl is long enough to hold
    const pts: Pt[] = [dense[0]!];
    for (const q of dense) if (Math.hypot(q.x - pts[pts.length - 1]!.x, q.y - pts[pts.length - 1]!.y) >= 1.5) pts.push(q);
    if (pts.length >= 3) k.run("tendril", c.green, pts);
  }
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
  richLeaf(k, c.blue, c.teal, c.teal, P(cx, cy), a, size, size * 0.2, 0, "fan");
  for (const s of [-1, 1]) k.leaf(c.red, P(cx, cy), a + s * 0.6, size * 0.8, size * 0.15, -s * 0.2, 0.5, "fan");
}

/** A rising vine from (x, yBase), `height` tall in a column `width` wide: gently S-curved stem, alternate leaves
 *  and berry sprigs sized to the column, a star-lily on top. */
export function vine(k: Kit, x: number, yBase: number, height: number, width: number, c: SignaturePalette = SIGNATURE, phase = 0, flip: 1 | -1 = 1) {
  const A = width * 0.1, top = height - width * 0.55, X = (t: number) => x + flip * A * Math.sin(1.6 * Math.PI * t + phase);
  const sw = Math.max(1.2, width * 0.06);
  k.satin("stem", c.green, Array.from({ length: 41 }, (_, i) => P(X(i / 40), yBase - (i / 40) * top)), sw);
  // the board's stems are two-coloured: a red line runs along the green
  k.run("stem-line", c.red, Array.from({ length: 41 }, (_, i) => P(X(i / 40) + flip * (sw / 2 + 0.15), yBase - (i / 40) * top * 0.97)));
  const step = width * 0.42, n = Math.floor((top - width * 0.3) / step), len = width * 0.42, half = Math.max(1.1, width * 0.075);
  for (let i = 0; i < n; i++) {
    const t = (width * 0.25 + i * step) / top, side = (i % 2 ? 1 : -1) * flip, y = yBase - t * top, px = X(t);
    const la = up + side * 0.85;
    // leaves crossing the red stem line get no outline (they would run alongside it, too close to stitch)
    if (side === flip) k.leaf(i % 3 === 2 ? c.olive : c.green, P(px, y), la, len, half, -side * 0.3, 0.42, "vine-leaf");
    else richLeaf(k, i % 3 === 2 ? c.olive : c.green, i % 2 ? c.blue : c.red, i % 3 === 2 ? c.green : c.olive, P(px, y), la, len, half, -side * 0.3, "vine-leaf");
    if (i % 3 === 0 && width >= 14) {
      // a curling tendril on the other side, with a small leaf: the vine grows into the space around it
      const ox = px - side * width * 0.08, oy = y - width * 0.12, pts: Pt[] = [];
      for (let q = 0; q <= 60; q++) { const u = q / 60, th = (side < 0 ? 0 : Math.PI) + -side * u * 1.7 * Math.PI, r = width * 0.16 * (1 - 0.6 * u); pts.push(P(ox - side * width * 0.18 + Math.cos(th) * r * -1 * -1, oy + Math.sin(th) * r)); }
      const sp: Pt[] = [pts[0]!]; for (const q of pts) if (Math.hypot(q.x - sp[sp.length - 1]!.x, q.y - sp[sp.length - 1]!.y) >= 1.5) sp.push(q);
      // only where it keeps clear of the leaves around it (its first point touches the stem)
      if (sp.length >= 3 && sp.slice(1).every((q) => clearance(k, q) >= 1.15)) k.run("tendril", c.green, sp);
    }
    if (i % 3 === 1) {
      // berry sprig opposite the leaf
      const sx = px - side * width * 0.3, sy = y - width * 0.18;
      // the stalk comes up into the cluster from below, clear of the two side berries
      k.run("sprig", c.red, [P(px, y - 0.6), P(sx, sy + Math.max(1, width * 0.045) * 2.4), P(sx, sy)]);
      // a cluster of three berries, touching, at the sprig's end
      const br = Math.max(1, width * 0.045);
      for (const [dx, dy] of [[0, 0], [-1.6, -1.05], [1.6, -1.05]]) k.disc(c.red, sx + dx * br, sy + dy * br, br, "berry");
    }
  }
  starLily(k, X(1), yBase - top - width * 0.15, width * 0.9, c);
}

/** Panel (yoke, placket, diary cover, boot shaft): vine columns with medallion columns between, star borders left and right. */
/** `dense`: true fills every clearing; a number caps the fill motifs (used to fit a corpus complexity profile). */
export function signaturePanel(width: number, height: number, c: SignaturePalette = SIGNATURE, columns = 2, dense: boolean | number = true): Kit {
  const k = new Kit("sig-");
  const border = 8, inner = width - 2 * border;
  for (const bx of [border / 2, width - border / 2]) {
    for (const x of [bx - 3, bx + 3]) k.satin("frame", c.red, [P(x, 2), P(x, height - 2)], 1);
    for (let y = 7, i = 0; y < height - 4; y += 8, i++) (i % 2 ? snowflake : star5)(k, bx, y, 5.4, c);
  }
  // vine columns narrower than medallion columns, so medallions are big enough for their full rings and halo
  const cols = columns * 2 + 1, vw = inner * 0.15, mwid = (inner - (columns + 1) * vw) / columns;
  const colX = (i: number) => border + Math.floor((i + 1) / 2) * vw + Math.floor(i / 2) * mwid + (i % 2 ? mwid : vw) / 2;
  for (let i = 0; i < cols; i++) {
    const x = colX(i), cw = i % 2 ? mwid : vw;
    // columns mirror about the centre: the right vine is the left one turned over
    if (i % 2 === 0) { const m = cols - 1 - i; vine(k, x, height - 4, height - 8, cw, c, Math.min(i, m) * 1.3, i > m ? -1 : 1); }
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
  if (dense) densify(k, { width, height, colors: { main: c.red, dark: c.blue, leaf: c.green, light: c.gold, accent: c.teal }, mirrorX: width / 2, ...(typeof dense === "number" ? { maxMotifs: dense } : {}) });
  k.resolveGaps();
  return k;
}

/** Band (cuff, hem, collar): a star row above, chevrons below, and between them medallions threaded on a vine, each
 *  pair joined by an S-scroll of stem with leaves and a berry, as along the foot of the pattern board. */
export function signatureBand(length: number, height: number, c: SignaturePalette = SIGNATURE, dense: boolean | number = true): Kit {
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
  if (dense) densify(k, { width: length, height, colors: { main: c.red, dark: c.blue, leaf: c.green, light: c.gold, accent: c.teal }, margin: 6.5, ...(typeof dense === "number" ? { maxMotifs: dense } : {}) });
  return k;
}
