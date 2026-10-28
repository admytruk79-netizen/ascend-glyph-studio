/**
 * Counted grid → stitch-engine objects. Each horizontal run of one thread becomes one path in the hand-embroiderer's
 * Danish method: the "/" legs going out, the "\" legs coming back, so every cell gets a full cross and the row
 * needs no jumps. Pitch is the counted fabric's thread pitch × threads per stitch (unequal warp/weft allowed).
 * Not production-approved: a sew-out on the real fabric must validate pitch, pull and coverage first.
 */
import type { DesignObject } from "../../stitch-engine/src/index.ts";
import { at, THREAD_HEX, THREADS, type Grid } from "./grid.ts";

export function toDesignObjects(g: Grid, o: { pitchXmm: number; pitchYmm?: number; prefix?: string }): DesignObject[] {
  const px = o.pitchXmm, py = o.pitchYmm ?? o.pitchXmm, out: DesignObject[] = [];
  const P = (x: number, y: number) => ({ x: x * px, y: y * py });
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; ) {
    const c = at(g, x, y);
    if (!c) { x++; continue; }
    let e = x; while (at(g, e + 1, y) === c) e++;
    const path = [P(x, y + 1)];
    for (let i = x; i <= e; i++) path.push(P(i + 1, y), P(i + 1, y + 1)); // "/" then down the shared edge
    for (let i = e; i >= x; i--) path.push(P(i, y), P(i, y + 1));         // "\" back
    out.push({ kind: "run", id: `${o.prefix ?? "x"}-${y}-${x}`, color: THREAD_HEX[THREADS[c]!], path, length: Math.hypot(px, py) + 0.01 });
    x = e + 1;
  }
  return out;
}
