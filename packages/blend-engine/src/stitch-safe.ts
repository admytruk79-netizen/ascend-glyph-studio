/**
 * Fail closed: the last step of every generator. A design leaves the engine only if it passes the stitch gate.
 *
 * The gate names the closest pair of objects when two sit too near, and short stitches can be traced to the object
 * that makes them; such a defect is repaired by removing the smaller offender (a seed, a fill motif, a tendril), never
 * by moving the main forms. If more than `maxLoss` of the objects would have to go, or the defect does not clear, the
 * design is rejected (null) rather than shipped broken.
 */
import type { Kit } from "./folk-rich.ts";
import { plan, recipes, runGate, type DesignObject, type StitchRecipe as Recipe } from "../../stitch-engine/src/index.ts";

const size = (o: DesignObject) => {
  const q = o.kind === "fill" ? o.polygon : o.path;
  const xs = q.map((p) => p.x), ys = q.map((p) => p.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + (o.kind === "satin" ? o.width : 0);
};
const finite = (o: DesignObject) => (o.kind === "fill" ? o.polygon : o.path).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

function shortStitchObjects(objs: DesignObject[], r: Recipe): string[] {
  const bad: string[] = [];
  for (const o of objs) {
    let prev: { x: number; y: number; cmd: string; tie?: boolean } | undefined, n = 0;
    for (const c of plan([o], r).commands as any[]) {
      if (c.cmd === "stitch" && prev?.cmd === "stitch" && !c.tie && !prev.tie && !c.turn) { const d = Math.hypot(c.x - prev.x, c.y - prev.y); if (d > 0.05 && d < r.minStitch - 1e-6) n++; }
      if (c.cmd === "stitch" || c.cmd === "jump") prev = c;
    }
    if (n) bad.push(o.id);
  }
  return bad;
}

export function stitchSafe(k: Kit, o: { recipe?: string; maxLoss?: number; maxRounds?: number } = {}): Kit | null {
  const r = recipes[o.recipe ?? "linen-180-prewashed"]!, start = k.objs.length;
  // geometry that is not finite is never repaired: it means an input was broken
  if (!start || !k.objs.every(finite)) return null;
  for (let round = 0; round < (o.maxRounds ?? 60); round++) {
    const p = plan(k.objs, r);
    const failed = runGate(k.objs, p.commands, r, { hoop: { name: "any", width: 4000, height: 4000 } }, 1).checks.filter((c) => !c.pass && c.id !== "recipe-validated" && c.id !== "hoop-fit");
    if (!failed.length) return k;
    const remove = new Set<string>();
    for (const f of failed) {
      if (f.id === "min-gap") {
        const m = /closest objects (\S+)\/(\S+)/.exec(f.detail);
        const a = k.objs.find((x) => x.id === m?.[1]), b = k.objs.find((x) => x.id === m?.[2]);
        if (a && b) remove.add(size(a) <= size(b) ? a.id : b.id);
      } else if (f.id === "min-stitch") for (const id of shortStitchObjects(k.objs, r)) remove.add(id);
      else return null; // satin width, density, hoop…: not a defect pruning can fix
    }
    if (!remove.size) return null;
    for (let i = k.objs.length - 1; i >= 0; i--) if (remove.has(k.objs[i]!.id)) k.objs.splice(i, 1);
    if (start - k.objs.length > start * (o.maxLoss ?? 0.15)) return null;
  }
  return null;
}
