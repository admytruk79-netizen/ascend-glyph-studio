/**
 * Rich folk vocabulary for embroidery: larger motifs drawn the way Ukrainian embroidery builds them,
 * from petals, buds, berries and seeds layered into flowers, trees, birds and stars.
 *
 * Every motif is made of stitchable objects only: fills (petals, leaves, berries), satin columns
 * (stems, horns, outlines) and triple runs (legs, tendrils). Layering a smaller fill on a larger one
 * is intentional and is read by the gate as an overlap, not a gap.
 *
 * Meanings and folk names live in data/semantics/motif-semantics.v1.json (ids in MOTIF_IDS).
 */
import { coveredByFill, pointInPolygon, pointSegDist, resample, type DesignObject } from "../../stitch-engine/src/index.ts";

export type Pt = { x: number; y: number };
const P = (x: number, y: number): Pt => ({ x, y });
const dir = (a: number) => P(Math.cos(a), Math.sin(a));

/** Semantics ids each motif draws on (for design lineage). */
export const MOTIF_IDS = {
  rose: "ua.ruzha", star8: "ua.eight-point-star", tree: "ua.tree-of-life", bird: "ua.birds", kalyna: "ua.kalyna",
  grapes: "ua.grapes", hops: "ua.hops", horns: "ua.rams-horns", rhomb: "ua.rhombus", zigzag: "ua.zigzag", cross: "ua.cross",
  constellation: "ua.constellation", lily: "ua.lily", oak: "ua.oak",
} as const;

export class Kit {
  readonly objs: DesignObject[] = [];
  private n = 0;
  constructor(private prefix = "") {}
  private id(kind: string) { return `${this.prefix}${kind}-${this.n++}`; }

  fill(kind: string, color: string, polygon: Pt[], angle?: number) { this.objs.push({ kind: "fill", id: this.id(kind), color, polygon, ...(angle === undefined ? {} : { angle }) }); }
  satin(kind: string, color: string, path: Pt[], width: number) { this.objs.push({ kind: "satin", id: this.id(kind), color, path, width }); }
  run(kind: string, color: string, path: Pt[]) { this.objs.push({ kind: "run", id: this.id(kind), color, path, triple: true, length: 2 }); }

  /**
   * Clearance: the stitch gate needs ≥ 0.8 mm between objects that do not touch. For every pair closer than `min`,
   * the smaller object either joins its neighbour (gap under 0.4 mm: moved onto it) or clears it (fills shrink about
   * their centre, lines are shortened at the near end). Repeats until clean or `passes` run out.
   */
  resolveGaps(min = 0.9, passes = 8): number {
    const shape = (o: DesignObject) => o.kind === "fill" ? { pts: resample([...o.polygon, o.polygon[0]!], 0.5), half: 0 } : { pts: resample(o.path, 0.5), half: o.kind === "satin" ? o.width / 2 : 0.25 };
    const size = (o: DesignObject) => { const q = o.kind === "fill" ? o.polygon : o.path; const xs = q.map((p) => p.x), ys = q.map((p) => p.y); return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); };
    let fixed = 0;
    for (let pass = 0; pass < passes; pass++) {
      const sh = this.objs.map(shape), box = sh.map((s) => { const xs = s.pts.map((p) => p.x), ys = s.pts.map((p) => p.y); return [Math.min(...xs) - s.half, Math.min(...ys) - s.half, Math.max(...xs) + s.half, Math.max(...ys) + s.half]; });
      let changed = 0;
      for (let i = 0; i < this.objs.length; i++) for (let j = i + 1; j < this.objs.length; j++) {
        const a = box[i]!, b = box[j]!;
        if (Math.max(a[0]! - b[2]!, b[0]! - a[2]!, a[1]! - b[3]!, b[1]! - a[3]!) >= min) continue;
        const A = this.objs[i]!, B = this.objs[j]!;
        if ((B.kind === "fill" && sh[i]!.pts.some((p) => pointInPolygon(p, B.polygon))) || (A.kind === "fill" && sh[j]!.pts.some((p) => pointInPolygon(p, A.polygon)))) continue;
        let best = { d: Infinity, p: sh[i]!.pts[0]!, q: sh[i]!.pts[0]! };
        for (const p of sh[i]!.pts) for (let k = 1; k < sh[j]!.pts.length; k++) {
          const u = sh[j]!.pts[k - 1]!, v = sh[j]!.pts[k]!, d = pointSegDist(p, u, v);
          if (d < best.d) { const dx = v.x - u.x, dy = v.y - u.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - u.x) * dx + (p.y - u.y) * dy) / L2)); best = { d, p, q: P(u.x + t * dx, u.y + t * dy) }; }
        }
        const gap = best.d - sh[i]!.half - sh[j]!.half;
        if (gap <= 0 || gap >= min || coveredByFill([best.p, best.q], this.objs, i, j)) continue;
        // move or shrink the smaller of the two; `from` is its near point, `to` the neighbour's
        const small = size(A) <= size(B) ? A : B, from = small === A ? best.p : best.q, to = small === A ? best.q : best.p;
        const ux = (to.x - from.x) / (best.d || 1), uy = (to.y - from.y) / (best.d || 1);
        const pts = small.kind === "fill" ? small.polygon : small.path;
        if (gap < 0.4) { const m = gap + 0.3; for (const p of pts) { p.x += ux * m; p.y += uy * m; } }
        else if (small.kind === "fill") {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const reach = Math.hypot(from.x - cx, from.y - cy) || 1, f = Math.max(0.5, (reach - (min - gap) - 0.05) / reach);
          for (const p of pts) { p.x = cx + (p.x - cx) * f; p.y = cy + (p.y - cy) * f; }
        } else {
          // shorten the line at whichever end is nearer the neighbour
          const end = Math.hypot(pts[0]!.x - from.x, pts[0]!.y - from.y) < Math.hypot(pts[pts.length - 1]!.x - from.x, pts[pts.length - 1]!.y - from.y) ? 0 : pts.length - 1;
          const nb = pts[end === 0 ? 1 : pts.length - 2]!, e = pts[end]!, L = Math.hypot(e.x - nb.x, e.y - nb.y) || 1, cut = Math.min(L * 0.9, min - gap + 0.05);
          e.x -= ((e.x - nb.x) / L) * cut; e.y -= ((e.y - nb.y) / L) * cut;
        }
        changed++; fixed++;
      }
      if (!changed) break;
    }
    return fixed;
  }

  /** Lens-shaped leaf or petal from `base` toward angle `a`; `bend` curves it sideways; `peak` (0–1) places the widest point. */
  leaf(color: string, base: Pt, a: number, len: number, half: number, bend = 0, peak = 0.42, kind = "leaf") {
    const d = dir(a), nv = dir(a + Math.PI / 2), k = Math.log(0.5) / Math.log(peak), N = 12;
    const c = (t: number) => P(base.x + d.x * len * t + nv.x * bend * len * t * t, base.y + d.y * len * t + nv.y * bend * len * t * t);
    const h = (t: number) => half * Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 0.8);
    const left: Pt[] = [], right: Pt[] = [];
    for (let i = 0; i <= N; i++) { const t = i / N, q = c(t), w = h(t); left.push(P(q.x + nv.x * w, q.y + nv.y * w)); if (i > 0 && i < N) right.push(P(q.x - nv.x * w, q.y - nv.y * w)); }
    this.fill(kind, color, [...left, ...right.reverse()], (a * 180) / Math.PI + 90);
  }
  disc(color: string, cx: number, cy: number, r: number, kind = "berry") { this.fill(kind, color, Array.from({ length: 18 }, (_, i) => P(cx + r * Math.cos((i / 18) * 2 * Math.PI), cy + r * Math.sin((i / 18) * 2 * Math.PI)))); }
  rhomb(color: string, cx: number, cy: number, rx: number, ry: number, kind = "rhomb") { this.fill(kind, color, [P(cx, cy - ry), P(cx + rx, cy), P(cx, cy + ry), P(cx - rx, cy)], 45); }
  /** Rhomb outline as four separate satin sides (a single column folds at the corners). */
  rhombOutline(color: string, cx: number, cy: number, r: number, width: number) {
    const v = [P(cx, cy - r), P(cx + r, cy), P(cx, cy + r), P(cx - r, cy)];
    for (let k = 0; k < 4; k++) this.satin("outline", color, [v[k]!, v[(k + 1) % 4]!], width);
  }
  /** Smooth curve through control points (quadratic B-spline), sampled for satin or run. */
  curve(points: Pt[], samples = 24): Pt[] {
    if (points.length < 3) return points;
    const out: Pt[] = [points[0]!];
    for (let i = 1; i < points.length - 1; i++) {
      const a = i === 1 ? points[0]! : P((points[i - 1]!.x + points[i]!.x) / 2, (points[i - 1]!.y + points[i]!.y) / 2);
      const b = points[i]!, c = i === points.length - 2 ? points[i + 1]! : P((points[i]!.x + points[i + 1]!.x) / 2, (points[i]!.y + points[i + 1]!.y) / 2);
      const m = Math.max(4, Math.round(samples / (points.length - 2)));
      for (let s = 1; s <= m; s++) { const t = s / m; out.push(P((1 - t) ** 2 * a.x + 2 * (1 - t) * t * b.x + t * t * c.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * b.y + t * t * c.y)); }
    }
    return out;
  }

  /**
   * ASCEND star (Oleksandr's blue sheet): a concave four-point star with eight seed-flicks around it.
   * It is the signature: every book design carries it at its heart.
   */
  ascendStar(cx: number, cy: number, R: number, star: string, seed: string, tilt = 0) {
    this.star4(cx, cy, R, star, tilt);
    for (let k = 0; k < 8; k++) {
      const a = tilt + Math.PI / 4 + (k * Math.PI) / 4 + (k % 2 ? 0.15 : -0.15), r0 = R * (k % 2 ? 1.12 : 0.92);
      this.leaf(seed, P(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)), a + 0.35, R * 0.5, Math.max(0.75, R * 0.09), 0.25, 0.42, "flick");
    }
  }

  /** Place an ASCEND form (polygons in a unit box, from ascend.ts) at (x, y) with the given size; colours cycle over its parts. */
  place(polys: Pt[][], x: number, y: number, size: number, colors: string[], mirror = false, kind = "ascend") {
    polys.forEach((poly, i) => this.fill(kind, colors[i % colors.length]!, poly.map((p) => P(x + (mirror ? 1 - p.x : p.x) * size, y + p.y * size)), 45));
  }

  /** Bud «бутон»: a full teardrop held by two sepals. */
  bud(base: Pt, a: number, size: number, body: string, sepal: string) {
    const d = dir(a);
    this.leaf(body, P(base.x + d.x * size * 0.12, base.y + d.y * size * 0.12), a, size, size * 0.27, 0, 0.62, "bud");
    for (const s of [-1, 1]) this.leaf(sepal, base, a + s * 0.62, size * 0.58, size * 0.13, -s * 0.25, 0.42, "sepal");
  }

  /** Rose «ружа»: eight long petals, eight short ones between, a centre and a seed. */
  rose(cx: number, cy: number, R: number, c: { petal: string; inner: string; centre: string; seed: string }, tilt = 0) {
    if (R < 6) {
      // too small for sixteen petals to stitch cleanly: six petals and a centre
      for (let k = 0; k < 6; k++) { const a = tilt - Math.PI / 2 + (k * Math.PI) / 3; this.leaf(c.petal, P(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3), a, R * 0.75, Math.max(0.75, R * 0.24), 0, 0.55, "petal"); }
      this.disc(c.centre, cx, cy, Math.max(0.9, R * 0.38), "centre");
      return;
    }
    for (let k = 0; k < 8; k++) { const a = tilt + (k * Math.PI) / 4; this.leaf(c.petal, P(cx + Math.cos(a) * R * 0.22, cy + Math.sin(a) * R * 0.22), a, R * 0.78, R * 0.19, 0, 0.55, "petal"); }
    for (let k = 0; k < 8; k++) { const a = tilt + Math.PI / 8 + (k * Math.PI) / 4; this.leaf(c.inner, P(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.25), a, R * 0.45, R * 0.1, 0, 0.5, "petal"); }
    this.disc(c.centre, cx, cy, R * 0.32, "centre");
    this.star8(cx, cy, R * 0.26, c.seed, c.seed, c.centre, true);
  }

  /** Eight-point star «восьмикутна зірка»: eight rhombic rays from the centre, two colours, a seed. */
  star8(cx: number, cy: number, R: number, a: string, b: string, seed: string, small = false) {
    for (let k = 0; k < 8; k++) {
      const t = (k * Math.PI) / 4, d = dir(t), nv = dir(t + Math.PI / 2), m = R * 0.5, w = R * 0.19;
      this.fill("ray", k % 2 ? b : a, [P(cx, cy), P(cx + d.x * m + nv.x * w, cy + d.y * m + nv.y * w), P(cx + d.x * R, cy + d.y * R), P(cx + d.x * m - nv.x * w, cy + d.y * m - nv.y * w)], (t * 180) / Math.PI);
    }
    if (!small) this.rhomb(seed, cx, cy, R * 0.17, R * 0.17, "seed");
  }

  /** Small concave four-point star. */
  star4(cx: number, cy: number, R: number, color: string, tilt = 0) {
    const pts: Pt[] = [];
    for (let k = 0; k < 8; k++) { const a = tilt + (k * Math.PI) / 4 - Math.PI / 2, r = k % 2 ? R * 0.34 : R; pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
    this.fill("star", color, pts, 30);
  }

  /** Star cluster: an eight-point star with small stars and seeds around it, placed irregularly like a constellation. */
  constellation(cx: number, cy: number, R: number, c: { a: string; b: string; seed: string; small: string }, seed = 1) {
    this.star8(cx, cy, R * 0.52, c.a, c.b, c.seed);
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + (rnd() - 0.5) * 0.5, r = R * (0.8 + rnd() * 0.18);
      if (k % 2) this.star4(cx + r * Math.cos(a), cy + r * Math.sin(a), R * (0.17 + rnd() * 0.06), c.small, rnd() * 0.4);
      else this.disc(c.b, cx + r * Math.cos(a), cy + r * Math.sin(a), Math.max(0.9, R * 0.07), "seed");
    }
  }

  /** Equal-arm cross «хрестик» with flared, notched arms, a seed and four grains between the arms. */
  cross(cx: number, cy: number, R: number, arm: string, seed: string) {
    for (let k = 0; k < 4; k++) {
      const t = (k * Math.PI) / 2, d = dir(t), nv = dir(t + Math.PI / 2);
      const at = (r: number, w: number) => P(cx + d.x * r + nv.x * w, cy + d.y * r + nv.y * w);
      this.fill("arm", arm, [at(R * 0.12, -R * 0.13), at(R, -R * 0.32), at(R * 0.82, 0), at(R, R * 0.32), at(R * 0.12, R * 0.13)], (t * 180) / Math.PI + 90);
    }
    this.rhomb(seed, cx, cy, R * 0.2, R * 0.2, "seed");
    for (let k = 0; k < 4; k++) { const t = Math.PI / 4 + (k * Math.PI) / 2; this.rhomb(seed, cx + Math.cos(t) * R * 0.62, cy + Math.sin(t) * R * 0.62, Math.max(0.9, R * 0.1), Math.max(0.9, R * 0.1), "grain"); }
  }

  /** Ram's horns «баранячі ріжки»: a stem that splits into two spirals curling outward and down, with a bud on top. */
  horns(cx: number, yBase: number, yTop: number, rho: number, c: { horn: string; bud: string; sepal: string; leaf: string }) {
    this.satin("stem", c.horn, [P(cx, yBase), P(cx, yTop)], 1.6);
    // right horn: starts at the stem top, curls up, out, down and inward; the left horn is its mirror image
    const right: Pt[] = [];
    for (let i = 0; i <= 60; i++) { const f = i / 60, th = Math.PI + f * 2.3 * Math.PI, r = rho * (1 - 0.68 * f); right.push(P(cx + rho + r * Math.cos(th), yTop + r * Math.sin(th))); }
    this.satin("horn", c.horn, right, 1.6);
    this.satin("horn", c.horn, right.map((p) => P(2 * cx - p.x, p.y)), 1.6);
    this.bud(P(cx, yTop - 0.6), -Math.PI / 2, (yBase - yTop) * 0.42, c.bud, c.sepal);
    for (const s of [-1, 1]) this.leaf(c.leaf, P(cx, yBase - (yBase - yTop) * 0.25), -Math.PI / 2 + s * 0.85, (yBase - yTop) * 0.45, 1.5, -s * 0.2);
  }

  /** Kalyna «калина» berry cluster: a rounded bunch of separate berries. */
  kalyna(cx: number, cy: number, r: number, color: string) {
    const step = 2 * r + 1.15;
    this.disc(color, cx, cy, r);
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + Math.PI / 6; this.disc(color, cx + step * Math.cos(a), cy + step * Math.sin(a), r); }
  }

  /** Grape «виноград» cluster: rows of berries tapering downward. */
  grapes(cx: number, yTop: number, r: number, color: string, rows = [4, 3, 2, 1]) {
    const step = 2 * r + 1.15;
    rows.forEach((n, i) => { for (let j = 0; j < n; j++) this.disc(color, cx + (j - (n - 1) / 2) * step, yTop + i * step * 0.87, r, "grape"); });
  }

  /** Bird «пташка»: a full body, head and beak, a wing laid on top, a fanned tail and legs. `f` is +1 facing right, −1 facing left. */
  bird(cx: number, cy: number, s: number, f: 1 | -1, c: { body: string; wing: string; tail: string; beak: string }) {
    const body: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * 2 * Math.PI, ex = Math.cos(t), ey = Math.sin(t);
      // fuller chest toward the head, tapering to the tail
      const rx = s * (ex * f > 0 ? 0.36 : 0.42), ry = s * 0.2 * (ex * f > 0 ? 1.08 : 0.85 - 0.25 * Math.abs(ex));
      const x = ex * rx, y = ey * ry, rot = -0.18 * f;
      body.push(P(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)));
    }
    // tail first so the body covers its base
    const tb = P(cx - f * s * 0.36, cy + s * 0.04), back = f > 0 ? Math.PI : 0;
    [[0.62, 0.42], [0.32, 0.5], [0.02, 0.44]].forEach(([da, l], i) => this.leaf(i === 1 ? c.wing : c.tail, tb, back + f * da!, s * l!, s * 0.075, 0, 0.55, "tail"));
    this.fill("body", c.body, body, 0);
    const hx = cx + f * s * 0.33, hy = cy - s * 0.25;
    this.disc(c.body, hx, hy, s * 0.13, "head");
    this.fill("beak", c.beak, [P(hx + f * s * 0.1, hy - s * 0.035), P(hx + f * s * 0.27, hy + s * 0.01), P(hx + f * s * 0.1, hy + s * 0.06)], 0);
    this.leaf(c.wing, P(cx + f * s * 0.14, cy - s * 0.04), back - f * 0.32, s * 0.5, s * 0.11, f * 0.18, 0.4, "wing");
    for (const dx of [-0.06, 0.06]) this.run("leg", c.beak, [P(cx + f * s * dx, cy + s * 0.18), P(cx + f * s * dx, cy + s * 0.38), P(cx + f * s * dx + f * Math.max(1.3, s * 0.12), cy + s * 0.4)]);
  }

  /** Tree of life «дерево життя»: grows from a seeded mound; rising branches end in buds, small roses and kalyna; crowned with a rose. */
  tree(cx: number, yBase: number, h: number, c: { trunk: string; leaf: string; bud: string; sepal: string; rose: { petal: string; inner: string; centre: string; seed: string }; berry: string; mound: string; seed: string }) {
    const top = yBase - h;
    this.fill("mound", c.mound, [P(cx - h * 0.2, yBase), P(cx - h * 0.1, yBase - h * 0.08), P(cx + h * 0.1, yBase - h * 0.08), P(cx + h * 0.2, yBase)], 0);
    this.rhomb(c.seed, cx, yBase - h * 0.035, h * 0.04, h * 0.025, "seed");
    this.satin("trunk", c.trunk, [P(cx, yBase - h * 0.07), P(cx, top + h * 0.2)], 1.8);
    for (const s of [-1, 1]) {
      // roots-side leaves at the foot
      this.leaf(c.leaf, P(cx, yBase - h * 0.12), -Math.PI / 2 + s * 1.15, h * 0.17, h * 0.04, -s * 0.2);
      // tier 1: low branch rising outward to a bud, two leaves along it
      const y1 = yBase - h * 0.26, e1 = P(cx + s * h * 0.27, y1 - h * 0.2);
      this.satin("branch", c.trunk, this.curve([P(cx, y1), P(cx + s * h * 0.2, y1 - h * 0.02), e1], 14), 1.3);
      this.bud(e1, -Math.PI / 2 + s * 0.25, h * 0.15, c.bud, c.sepal);
      this.leaf(c.leaf, P(cx + s * h * 0.12, y1 - h * 0.01), Math.PI / 2 - s * 0.9, h * 0.12, h * 0.03, s * 0.2);
      this.leaf(c.leaf, P(cx + s * h * 0.22, y1 - h * 0.08), -s * 0.05 + (s > 0 ? 0 : Math.PI), h * 0.11, h * 0.028, -s * 0.25);
      // tier 2: branch to a small rose, kalyna hanging under it
      const y2 = yBase - h * 0.5, e2 = P(cx + s * h * 0.17, y2 - h * 0.1);
      this.satin("branch", c.trunk, this.curve([P(cx, y2), P(cx + s * h * 0.12, y2 - h * 0.01), e2], 12), 1.2);
      // a tall tree carries a rose with kalyna hanging under it; a small one (under 40 mm) has room for the kalyna only
      if (h >= 40) { this.rose(e2.x, e2.y, Math.max(3.6, h * 0.08), c.rose); this.kalyna(cx + s * h * 0.115, y2 + h * 0.075, Math.max(1.05, h * 0.024), c.berry); }
      else this.kalyna(e2.x + s * 1.2, e2.y + 1.6, 1.05, c.berry);
      // tier 3: buds and leaves under the crown
      this.leaf(c.leaf, P(cx, top + h * 0.28), -Math.PI / 2 + s * 1.0, h * 0.13, h * 0.032, -s * 0.15);
      this.bud(P(cx, top + h * 0.2), -Math.PI / 2 + s * 0.75, h * 0.1, c.bud, c.sepal); // based on the trunk so its sepals join it
    }
    this.rose(cx, top + h * 0.1, h * 0.11, c.rose);
  }

  /** Lily «лілея»: three petals rising from a cup, on a stalk with leaves and two side buds. */
  lily(cx: number, yBase: number, h: number, c: { stalk: string; petal: string; side: string; cup: string; leaf: string; bud: string; sepal: string }) {
    const top = yBase - h, head = P(cx, top + h * 0.34);
    this.satin("stalk", c.stalk, [P(cx, yBase), P(cx, head.y + h * 0.04)], 1.6);
    for (const s of [-1, 1]) {
      this.leaf(c.leaf, P(cx, yBase - h * 0.12), -Math.PI / 2 + s * 0.95, h * 0.3, h * 0.05, -s * 0.3);
      const b0 = P(cx, yBase - h * 0.38), b1 = P(cx + s * h * 0.17, yBase - h * 0.52);
      this.satin("stalk", c.stalk, this.curve([b0, P(cx + s * h * 0.12, b0.y), b1], 10), 1.2);
      this.bud(b1, -Math.PI / 2 + s * 0.35, h * 0.16, c.bud, c.sepal);
    }
    for (const s of [-1, 1]) this.leaf(c.side, P(cx + s * h * 0.02, head.y), -Math.PI / 2 + s * 0.42, h * 0.36, h * 0.06, s * 0.42, 0.38, "petal");
    this.leaf(c.petal, P(cx, head.y + h * 0.02), -Math.PI / 2, h * 0.38, h * 0.085, 0, 0.45, "petal");
    this.fill("cup", c.cup, [P(cx - h * 0.1, head.y - h * 0.02), P(cx + h * 0.1, head.y - h * 0.02), P(cx + h * 0.05, head.y + h * 0.06), P(cx - h * 0.05, head.y + h * 0.06)], 0);
  }
}
