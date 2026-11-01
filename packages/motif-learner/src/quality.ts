/**
 * Automatic motif-quality filter for grids read from photographs and scans. It keeps shapes that look like counted
 * motifs and drops what the reader picks up by mistake: fold lines and seams (thin lines), scattered stitches (noise),
 * tiny pieces, solid fills (cloth or shadow read as stitches) and shapes with no symmetry at all (perspective, clutter).
 * Balanced: only clear-cut noise is rejected. Lack of symmetry is a soft signal (a photographed motif is often skewed):
 * it lowers the rank instead of rejecting.
 */
import { at, components, type Grid } from "./grid.ts";
import { agreement, detectSymmetry, type Group } from "./symmetry.ts";
import { flipH, flipV } from "./grid.ts";

export interface MotifQuality {
  stitches: number;
  /** Share of stitches with at least two stitched neighbours (8-connected): low for scattered noise. */
  solidity: number;
  /** Stitches per cell of the longer side: about 1 for a one-stitch line, higher for real shapes. */
  thickness: number;
  density: number;
  /** Share of stitches in the largest island. */
  largestIsland: number;
  /** Best mirror agreement (left–right or top–bottom), 0–1. */
  mirror: number;
  /** Distinct threads used. */
  threads: number;
  group: Group;
  passes: boolean;
  /** Hard reasons: any one rejects the motif. */
  reasons: string[];
  /** Soft signals: lower the rank only. */
  soft: string[];
  /** 0–1 ranking score among motifs that pass. */
  score: number;
}

export const QUALITY_LIMITS = { minStitches: 25, minSide: 7, minSolidity: 0.65, minThickness: 1.6, minDensity: 0.12, maxDensity: 0.85, minLargestIsland: 0.5, minMirror: 0.7 };

export function motifQuality(g: Grid, limits = QUALITY_LIMITS): MotifQuality {
  let stitches = 0, solid = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (!at(g, x, y)) continue;
    stitches++;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(g, x + dx, y + dy)) n++;
    if (n >= 2) solid++;
  }
  // largest island by flood fill
  const seen = new Uint8Array(g.cells.length);
  let largest = 0;
  for (let i = 0; i < g.cells.length; i++) {
    if (!g.cells[i] || seen[i]) continue;
    let size = 0; const stack = [i]; seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!, x = j % g.w, y = (j - x) / g.w; size++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy, k = ny * g.w + nx; if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
    }
    largest = Math.max(largest, size);
  }
  // shape-only mirror agreement (colour read from photographs is unreliable)
  const mask: Grid = { ...g, cells: g.cells.map((c) => (c ? 1 : 0)) };
  const mirror = Math.max(agreement(mask, flipH(mask)), agreement(mask, flipV(mask)));
  const q: MotifQuality = {
    stitches, solidity: stitches ? solid / stitches : 0, thickness: stitches / Math.max(1, g.w, g.h), density: stitches / Math.max(1, g.w * g.h),
    largestIsland: stitches ? largest / stitches : 0, mirror, threads: new Set(g.cells.filter(Boolean)).size, group: detectSymmetry(mask, limits.minMirror), passes: false, reasons: [], soft: [], score: 0,
  };
  if (stitches < limits.minStitches || Math.min(g.w, g.h) < limits.minSide) q.reasons.push("too-small");
  if (q.solidity < limits.minSolidity) q.reasons.push("scattered");
  if (q.thickness < limits.minThickness) q.reasons.push("thin-line");
  if (q.density < limits.minDensity) q.reasons.push("too-sparse");
  if (q.density > limits.maxDensity) q.reasons.push("solid-fill");
  if (q.largestIsland < limits.minLargestIsland) q.reasons.push("fragmented");
  // one thread filling most of its box is usually an object's silhouette or a shadow, not embroidery
  if (q.threads === 1 && q.density > 0.75) q.reasons.push("single-colour-fill");
  if (q.mirror < limits.minMirror) q.soft.push("no-symmetry");
  if (q.threads === 1 && q.density > 0.5) q.soft.push("single-colour-mass");
  if (Math.max(g.w, g.h) > 80) q.soft.push("very-large");
  q.passes = q.reasons.length === 0;
  const penalty = (q.soft.includes("single-colour-mass") ? 0.4 : 1) * (q.soft.includes("very-large") ? 0.6 : 1);
  q.score = q.passes ? +((Math.min(1, stitches / 150) * 0.25 + q.solidity * 0.25 + q.mirror * 0.35 + q.largestIsland * 0.15) * penalty).toFixed(3) : 0;
  return q;
}

/** Number of separate islands, re-exported for reports. */
export { components };
