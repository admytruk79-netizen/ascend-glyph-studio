/**
 * Fail-closed release gate (docs/EMBROIDERY-PRODUCTION-ENGINE.md §7). A file is released only when every
 * check passes; a check that cannot be evaluated counts as a failure.
 */
import { type Pt, bounds, dist, pointInPolygon, pointSegDist, resample } from "./geometry.js";
import type { Command } from "./dst.js";
import type { DesignObject } from "./plan.js";
import type { StitchRecipe } from "./recipes.js";

export interface Hoop { name: string; width: number; height: number }
export interface GateLimits { hoop: Hoop; maxStitches?: number; maxMinutes?: number }
export interface Check { id: string; pass: boolean; detail: string }
export interface GateResult { release: boolean; checks: Check[] }

export function runGate(objects: DesignObject[], commands: Command[], r: StitchRecipe, lim: GateLimits, minutes: number): GateResult {
  const checks: Check[] = [];
  const add = (id: string, pass: boolean, detail: string) => checks.push({ id, pass, detail });

  const satins = objects.filter((o) => o.kind === "satin") as Extract<DesignObject, { kind: "satin" }>[];
  const badSatin = satins.filter((s) => s.width < r.minSatinWidth || s.width > r.maxSatinWidth);
  add("satin-width", badSatin.length === 0, badSatin.length ? `out of ${r.minSatinWidth}–${r.maxSatinWidth} mm: ${badSatin.map((s) => `${s.id}=${s.width}`).join(", ")}` : `${satins.length} columns within ${r.minSatinWidth}–${r.maxSatinWidth} mm`);

  const fills = objects.filter((o) => o.kind === "fill") as Extract<DesignObject, { kind: "fill" }>[];
  const dense = fills.filter((f) => (f.rowSpacing ?? r.fillRowSpacing) < r.minFillRowSpacing);
  add("fill-density", r.fillRowSpacing >= r.minFillRowSpacing && dense.length === 0,
    dense.length ? `denser than ${r.minFillRowSpacing} mm: ${dense.map((f) => `${f.id}=${f.rowSpacing}`).join(", ")}` : `row spacing ${r.fillRowSpacing} mm (min ${r.minFillRowSpacing})`);

  // stitch lengths: ignore ties; ignore the very short closing stitch of a run that lands on its own start
  let short = 0, long = 0, prev: Command | undefined;
  for (const c of commands) {
    if (c.cmd === "stitch" && prev && (prev.cmd === "stitch")) {
      const d = dist(prev, c);
      if (!c.tie && !prev.tie && !c.turn && d > 0.05 && d < r.minStitch - 1e-6) short++;
      if (d > 12.1) long++;
    }
    if (c.cmd === "stitch" || c.cmd === "jump") prev = c;
  }
  add("min-stitch", short === 0, `${short} stitches shorter than ${r.minStitch} mm`);
  add("max-stitch", long === 0, `${long} stitches longer than 12.1 mm`);

  const pts = commands.filter((c) => c.cmd === "stitch");
  if (pts.length === 0) add("hoop-fit", false, "no stitches");
  else {
    const b = bounds(pts);
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    const fits = (w <= lim.hoop.width && h <= lim.hoop.height) || (h <= lim.hoop.width && w <= lim.hoop.height);
    add("hoop-fit", fits, `design ${w.toFixed(1)}×${h.toFixed(1)} mm, hoop ${lim.hoop.name} ${lim.hoop.width}×${lim.hoop.height} mm`);
  }

  if (lim.maxStitches !== undefined) add("stitch-budget", pts.length <= lim.maxStitches, `${pts.length} stitches (budget ${lim.maxStitches})`);
  if (lim.maxMinutes !== undefined) add("time-budget", minutes <= lim.maxMinutes, `${minutes.toFixed(1)} min (budget ${lim.maxMinutes})`);

  const gap = minGap(objects);
  add("min-gap", gap.value >= r.minGap, gap.value === Infinity ? "single object" : `closest objects ${gap.pair} ${gap.value.toFixed(2)} mm (min ${r.minGap})`);

  add("recipe-validated", r.validated !== false, r.validated ? `sew-out ${r.validated.sewOutId}` : `recipe ${r.id} has no sew-out yet: prototype only`);

  return { release: checks.every((c) => c.pass), checks };
}

/** Outline of an object as sampled points and segments, inflated by half the stroke width. */
function outline(o: DesignObject): { pts: Pt[]; half: number } {
  if (o.kind === "fill") return { pts: resample([...o.polygon, o.polygon[0]!], 0.5), half: 0 };
  if (o.kind === "satin") return { pts: resample(o.path, 0.5), half: o.width / 2 };
  return { pts: resample(o.path, 0.5), half: 0.25 };
}

/** Smallest edge-to-edge gap between objects of different colours or non-touching objects (touching = overlapping by design). */
function productionObjectId(id:string):string{
  const m=id.match(/^(.*):p\d+$/);
  return m?.[1]??id;
}
function minGap(objects: DesignObject[]): { value: number; pair: string } {
  let best = Infinity, pair = "";
  const outs = objects.map(outline);
  const boxes = outs.map((o) => { const b = bounds(o.pts); return { minX: b.minX - o.half, minY: b.minY - o.half, maxX: b.maxX + o.half, maxY: b.maxY + o.half }; });
  // A point of one object inside the other's fill means one is layered on top of the other: an overlap, not a gap.
  const inside = (P: Pt[], o: DesignObject) => o.kind === "fill" && P.some((p) => pointInPolygon(p, o.polygon));
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++) {
      // Multiple paths compiled from one ProductionGlyphObject are one motif.
      // Internal spacing is part of that object's canonical geometry, not an
      // inter-object clearance violation.
      if(productionObjectId(objects[i]!.id)===productionObjectId(objects[j]!.id))continue;
      const A = outs[i]!, B = outs[j]!, a = boxes[i]!, b = boxes[j]!;
      if (Math.max(a.minX - b.maxX, b.minX - a.maxX, a.minY - b.maxY, b.minY - a.maxY) >= best) continue; // cannot beat the current best
      if (inside(A.pts, objects[j]!) || inside(B.pts, objects[i]!)) continue;
      let d = Infinity, near: [Pt, Pt] = [A.pts[0]!, A.pts[0]!];
      for (const p of A.pts) for (let k = 1; k < B.pts.length; k++) { const e = pointSegDist(p, B.pts[k - 1]!, B.pts[k]!); if (e < d) { d = e; near = [p, closestOnSeg(p, B.pts[k - 1]!, B.pts[k]!)]; } }
      const g = d - A.half - B.half;
      if (g <= 0) continue; // overlapping or touching objects are intentional joins
      if (coveredByFill(near, objects, i, j)) continue; // the gap lies on top of another fill, so no fabric shows
      if (g < best) { best = g; pair = `${objects[i]!.id}/${objects[j]!.id}`; }
    }
  return { value: best, pair };
}

function closestOnSeg(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** True when the space between two near objects is stitched over by a third fill (e.g. a seed and a branch both on a flower centre). */
export function coveredByFill(near: [Pt, Pt], objects: DesignObject[], i: number, j: number): boolean {
  const samples = [0.25, 0.5, 0.75].map((t) => ({ x: near[0].x + (near[1].x - near[0].x) * t, y: near[0].y + (near[1].y - near[0].y) * t }));
  return objects.some((o, k) => k !== i && k !== j && o.kind === "fill" && samples.every((p) => pointInPolygon(p, o.polygon)));
}
