/**
 * Design objects → ordered stitch commands. Objects are grouped by colour, ordered nearest-neighbour
 * within each colour, tied in and off, and joined by jumps (with a trim when the jump exceeds 7 mm).
 */
import { type Pt, dist } from "./geometry.js";
import { type Stitch, runStitch, satinColumn, tatamiFill, tieAt, tripleRun } from "./stitches.js";
import type { Command } from "./dst.js";
import type { StitchRecipe } from "./recipes.js";

export type DesignObject =
  | { kind: "run"; id: string; color: string; path: Pt[]; triple?: boolean; length?: number }
  | { kind: "satin"; id: string; color: string; path: Pt[]; width: number; spacing?: number }
  | { kind: "fill"; id: string; color: string; polygon: Pt[]; angle?: number; rowSpacing?: number };

export interface PlannedBlock { objectId: string; color: string; runs: Stitch[][] }
export interface Plan { commands: Command[]; blocks: PlannedBlock[]; colors: string[]; trims: number; jumps: number }

export const TRIM_OVER_MM = 7;

export function stitchObject(o: DesignObject, r: StitchRecipe): Stitch[][] {
  switch (o.kind) {
    case "run": return [o.triple ? tripleRun(o.path, o.length ?? 2.5) : runStitch(o.path, o.length ?? 2.5)];
    case "satin": return [satinColumn(o.path, o.width, { spacing: o.spacing ?? r.satinSpacing, pullComp: r.pullComp })];
    case "fill": return tatamiFill(o.polygon, { angle: o.angle ?? 0, rowSpacing: o.rowSpacing ?? r.fillRowSpacing, pullComp: r.pullComp });
  }
}

export function plan(objects: DesignObject[], r: StitchRecipe): Plan {
  const colors: string[] = [];
  for (const o of objects) if (!colors.includes(o.color)) colors.push(o.color);
  const commands: Command[] = [];
  const blocks: PlannedBlock[] = [];
  let pos: Pt = { x: 0, y: 0 };
  let trims = 0, jumps = 0;

  colors.forEach((color, ci) => {
    if (ci > 0) { commands.push({ cmd: "trim", ...pos }, { cmd: "color", ...pos }); }
    const pending = objects.filter((o) => o.color === color).map((o) => ({ o, runs: stitchObject(o, r) }));
    while (pending.length) {
      // nearest object start
      let bi = 0, bd = Infinity;
      pending.forEach((p, i) => { const s = p.runs[0]?.[0]; if (s) { const d = dist(pos, s); if (d < bd) { bd = d; bi = i; } } });
      const { o, runs } = pending.splice(bi, 1)[0]!;
      blocks.push({ objectId: o.id, color, runs });
      for (const run of runs) {
        if (run.length < 2) continue;
        const start = run[0]!;
        if (dist(pos, start) > 0.05 || commands.length === 0) {
          if (commands.length && dist(pos, start) > TRIM_OVER_MM) { tieOff(); commands.push({ cmd: "trim", ...pos }); trims++; }
          commands.push({ cmd: "jump", x: start.x, y: start.y }); jumps++;
        }
        for (const t of tieAt(start, run[1]!)) commands.push({ cmd: "stitch", x: t.x, y: t.y, tie: true });
        for (const s of run.slice(1)) commands.push({ cmd: "stitch", x: s.x, y: s.y, ...(s.turn ? { turn: true } : {}) });
        pos = run[run.length - 1]!;
        tieOff(run[run.length - 2]!);
      }
    }
  });
  commands.push({ cmd: "trim", ...pos }, { cmd: "end", ...pos });
  return { commands, blocks, colors, trims, jumps };

  function tieOff(prev?: Pt) {
    if (!prev) return;
    for (const t of tieAt(pos, prev).slice(1)) commands.push({ cmd: "stitch", x: t.x, y: t.y, tie: true });
  }
}
