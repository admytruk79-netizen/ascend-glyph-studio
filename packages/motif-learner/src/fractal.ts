/**
 * Fractal motifs with decoration: a motif made of smaller motifs (a rhomb of rhombs, a star of stars), finished with
 * small decorative elements at its outer tips (berries, dots, small crosses, ray ends), as counted embroidery does.
 *
 *  - layout × element: every stitched cell of a generated layout motif becomes a copy of a generated element motif,
 *    coloured by the layout (two levels of the same learned construction: self-similar, not a texture);
 *  - decorations: the small islands (≤ 6 stitches) that the training motifs carry, learned with their frequencies,
 *    attached one cell beyond each outer tip, then repeated over the symmetry group so symmetry stays exact;
 *  - box-counting dimension: measured on every training motif, so a fractal can be compared with the tradition's
 *    own range instead of being assumed to be "fractal enough".
 */
import { at, blank, crop, parseChart, toChart, type Grid } from "./grid.ts";
import { colourShape, generateShape, nearestReference, rng } from "./generate.ts";
import { logLikelihood, type SubModel } from "./model.ts";
import { groupOps, type Group } from "./symmetry.ts";

/** Box-counting dimension: slope of log(boxes holding a stitch) against log(1/box size), box sizes 1, 2, 4, 8 … */
export function boxCountingDimension(g: Grid): number {
  const pts: [number, number][] = [];
  for (let s = 1; s <= Math.max(1, Math.min(g.w, g.h) >> 1); s *= 2) {
    let n = 0;
    for (let by = 0; by < g.h; by += s) for (let bx = 0; bx < g.w; bx += s) {
      let hit = false;
      for (let y = by; y < by + s && !hit; y++) for (let x = bx; x < bx + s && !hit; x++) hit = at(g, x, y) > 0;
      if (hit) n++;
    }
    if (n) pts.push([Math.log(1 / s), Math.log(n)]);
  }
  if (pts.length < 2) return 0;
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
}

/** Small separate islands (≤ maxCells stitches) in the training motifs: the decorative vocabulary, with counts. */
export function learnDecorations(sub: SubModel, maxCells = 6): { chart: string[]; count: number }[] {
  const counts = new Map<string, number>();
  for (const ref of sub.references) {
    const g = parseChart(ref.chart), seen = new Uint8Array(g.cells.length);
    for (let i = 0; i < g.cells.length; i++) {
      if (!g.cells[i] || seen[i]) continue;
      const island: number[] = [], stack = [i]; seen[i] = 1;
      while (stack.length) {
        const j = stack.pop()!, x = j % g.w, y = (j - x) / g.w; island.push(j);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy, k = ny * g.w + nx; if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
      }
      if (island.length > maxCells) continue;
      const part = blank(g.w, g.h); island.forEach((j) => (part.cells[j] = g.cells[j]!));
      const key = toChart(crop(part)).join("/");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts].map(([k, count]) => ({ chart: k.split("/"), count })).sort((a, b) => b.count - a.count || a.chart.join().localeCompare(b.chart.join()));
}

/** Each stitched layout cell becomes an element copy; the element's main thread takes the layout cell's thread. */
export function compose(layout: Grid, element: Grid, gap = 0): Grid {
  const sx = element.w + gap, sy = element.h + gap, out = blank(layout.w * sx - gap, layout.h * sy - gap);
  const tally = new Map<number, number>(); element.cells.forEach((c) => c && tally.set(c, (tally.get(c) ?? 0) + 1));
  const main = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1;
  for (let ly = 0; ly < layout.h; ly++) for (let lx = 0; lx < layout.w; lx++) {
    const lc = at(layout, lx, ly); if (!lc) continue;
    for (let y = 0; y < element.h; y++) for (let x = 0; x < element.w; x++) { const c = at(element, x, y); if (c) out.cells[(ly * sy + y) * out.w + lx * sx + x] = c === main ? lc : c; }
  }
  return out;
}

/**
 * Where ornament goes on the layout: branch ends (a stitched cell with one neighbour, pointing outward); a closed
 * layout with no ends uses its outermost cell in each of the 8 directions instead.
 */
export function anchors(g: Grid): { x: number; y: number; dx: number; dy: number }[] {
  const out: { x: number; y: number; dx: number; dy: number }[] = [], cx = (g.w - 1) / 2, cy = (g.h - 1) / 2;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!at(g, x, y)) continue;
    let n = 0, nx = 0, ny = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(g, x + dx, y + dy)) { n++; nx = dx; ny = dy; }
    const ox = Math.sign(x - cx), oy = Math.sign(y - cy);
    if (n === 1 && (ox || oy) && (-nx === ox || -ny === oy)) out.push({ x, y, dx: -nx, dy: -ny });
  }
  if (out.length) return out;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    let best: { x: number; y: number; dx: number; dy: number } | null = null, bestD = -Infinity;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const d = (x - cx) * dx + (y - cy) * dy; if (at(g, x, y) && d > bestD + 1e-9) { bestD = d; best = { x, y, dx, dy }; } }
    if (best && bestD > 0) out.push(best);
  }
  return out;
}

/**
 * Compose layout × element with one free block around it, put the chosen decoration in the empty block beyond each
 * anchor, then repeat the decoration layer over the symmetry group so symmetry stays exact.
 */
export function composeDecorated(layout: Grid, element: Grid, group: Group, decorations: { chart: string[]; count: number }[], seed: number, gap = 1): { grid: Grid; decoration: string[] | null } {
  const sx = element.w + gap, sy = element.h + gap, framed = blank(layout.w + 2, layout.h + 2);
  for (let y = 0; y < layout.h; y++) for (let x = 0; x < layout.w; x++) framed.cells[(y + 1) * framed.w + x + 1] = at(layout, x, y);
  const out = compose(framed, element, gap);
  if (!decorations.length) return { grid: crop(out), decoration: null };
  const r = rng(seed ^ 0x5bd1e995), total = decorations.reduce((s, d) => s + d.count, 0);
  let u = r() * total, deco = decorations[0]!;
  for (const d of decorations) if ((u -= d.count) <= 0) { deco = d; break; }
  const el = parseChart(deco.chart), layer = blank(out.w, out.h);
  for (const a of anchors(layout)) {
    const bx = (a.x + 1 + a.dx) * sx, by = (a.y + 1 + a.dy) * sy;   // the empty block beyond the anchor
    const ox = bx + ((element.w - el.w) >> 1), oy = by + ((element.h - el.h) >> 1);
    for (let y = 0; y < el.h; y++) for (let x = 0; x < el.w; x++) {
      const c = at(el, x, y), X = ox + x, Y = oy + y;
      if (c && X >= 0 && Y >= 0 && X < out.w && Y < out.h && !out.cells[Y * out.w + X]) layer.cells[Y * out.w + X] = c;
    }
  }
  for (const op of groupOps(group, out.w, out.h)) for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const c = layer.cells[y * out.w + x]; if (!c) continue;
    const [X, Y] = op(x, y), k = Y * out.w + X;
    if (!out.cells[k]) out.cells[k] = c;
  }
  return { grid: crop(out), decoration: deco.chart };
}

export interface FractalCandidate {
  grid: Grid; seed: number; group: Group; layoutSize: number; elementSize: number; decoration: string[] | null;
  dimension: number; trainingDimension: { min: number; max: number }; logLikelihood: number; nearest: { id: string | null; iou: number };
}

export function generateFractal(sub: SubModel, o: { seed: number; group?: Group; layoutSize?: number; elementSize?: number; decorate?: boolean }): FractalCandidate {
  const group = o.group ?? "d4", layoutSize = o.layoutSize ?? 9, elementSize = o.elementSize ?? 5;
  const iterations = 6000;
  // layout: an open, branching arrangement; element: a compact unit dense enough to read at small scale
  const layoutShape = generateShape(sub, { seed: o.seed, group, size: layoutSize, iterations, density: 0.3 });
  const layout = colourShape(layoutShape.grid, group, sub, { seed: o.seed });
  const elementShape = generateShape(sub, { seed: o.seed + 1, group: "d4", size: elementSize, iterations, density: 0.55 });
  const element = crop(colourShape(elementShape.grid, "d4", sub, { seed: o.seed + 1 }));
  const decorated = composeDecorated(layout, element, group, o.decorate === false ? [] : learnDecorations(sub), o.seed), grid = decorated.grid;
  const dims = sub.references.map((r) => boxCountingDimension(parseChart(r.chart)));
  return {
    grid, seed: o.seed, group, layoutSize, elementSize, decoration: decorated.decoration,
    dimension: boxCountingDimension(grid), trainingDimension: { min: Math.min(...dims), max: Math.max(...dims) },
    logLikelihood: logLikelihood(grid, sub), nearest: nearestReference(grid, sub.references),
  };
}
