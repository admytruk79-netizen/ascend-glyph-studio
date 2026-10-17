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

function enforceMinimumNeedleSpacing(run: Stitch[], minimum: number): Stitch[] {
  if(run.length<3||minimum<=0)return run.map(p=>({...p}));
  const out:Stitch[]=[{...run[0]!}];
  for(let i=1;i<run.length-1;i++){
    const p=run[i]!,prev=out[out.length-1]!;
    if(p.turn||p.tie||prev.tie||dist(prev,p)>=minimum-1e-9)out.push({...p});
  }
  const last={...run[run.length-1]!};
  while(out.length>1&&!last.turn&&!last.tie&&dist(out[out.length-1]!,last)<minimum-1e-9){
    const before=out[out.length-2]!;
    if(before.turn||before.tie||dist(before,last)>=minimum-1e-9){out.pop();break;}
    out.pop();
  }
  if(out.length===0||dist(out[out.length-1]!,last)>0.05||last.turn||last.tie)out.push(last);
  return out;
}

export function stitchObject(o: DesignObject, r: StitchRecipe): Stitch[][] {
  let runs:Stitch[][];
  switch (o.kind) {
    case "run": runs=[o.triple ? tripleRun(o.path, o.length ?? 2.5) : runStitch(o.path, o.length ?? 2.5)];break;
    case "satin": runs=[satinColumn(o.path, o.width, { spacing: o.spacing ?? r.satinSpacing, pullComp: r.pullComp })];break;
    case "fill": runs=tatamiFill(o.polygon, { angle: o.angle ?? 0, rowSpacing: o.rowSpacing ?? r.fillRowSpacing, pullComp: r.pullComp });break;
  }
  return runs.map(run=>enforceMinimumNeedleSpacing(run,r.minStitch));
}

/** Group independent shapes while retaining paint order wherever conservative stroke-expanded boxes meet.
 * Returns original objects without mutating them; compensation margin keeps nearby stitching dependent.
 */
export function orderIndependentLayers(objects: DesignObject[], marginMm = .5): DesignObject[] {
  if(!Number.isFinite(marginMm)||marginMm<0)throw Error('invalid-layer-margin');
  const boxes=objects.map(o=>{const pts=o.kind==='fill'?o.polygon:o.path,half=(o.kind==='satin'?o.width/2:o.kind==='run'?.25:0)+marginMm;
    return {x0:Math.min(...pts.map(p=>p.x))-half,x1:Math.max(...pts.map(p=>p.x))+half,y0:Math.min(...pts.map(p=>p.y))-half,y1:Math.max(...pts.map(p=>p.y))+half};});
  const next=objects.map(()=>[] as number[]),degree=objects.map(()=>0);
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
    const a=boxes[i]!,b=boxes[j]!;
    if(a.x0<=b.x1&&b.x0<=a.x1&&a.y0<=b.y1&&b.y0<=a.y1){next[i]!.push(j);degree[j]!++;}
  }
  const ready=degree.flatMap((d,i)=>d===0?[i]:[]),ordered:DesignObject[]=[];
  let color:string|undefined;
  while(ready.length){let at=ready.findIndex(i=>objects[i]!.color===color);if(at<0)at=0;const i=ready.splice(at,1)[0]!,o=objects[i]!;ordered.push(o);color=o.color;
    for(const j of next[i]!){degree[j]=degree[j]!-1;if(degree[j]===0)ready.push(j);}
  }
  if(ordered.length!==objects.length)throw Error('layer-order-cycle');
  return ordered;
}

export function plan(objects: DesignObject[], r: StitchRecipe, options: {preserveObjectOrder?: boolean} = {}): Plan {
  const colors: string[] = [];
  const groups: {color: string; objects: DesignObject[]}[] = [];
  for (const o of objects) {
    let group = options.preserveObjectOrder ? groups.at(-1) : groups.find(g => g.color === o.color);
    if (!group || group.color !== o.color) { group = {color:o.color,objects:[]};groups.push(group);colors.push(o.color); }
    group.objects.push(o);
  }
  const commands: Command[] = [];
  const blocks: PlannedBlock[] = [];
  let pos: Pt = { x: 0, y: 0 };
  let trims = 0, jumps = 0;

  groups.forEach(({color,objects:groupObjects}, ci) => {
    if (ci > 0) { commands.push({ cmd: "trim", ...pos }, { cmd: "color", ...pos }); }
    const pending = groupObjects.map((o) => ({ o, runs: stitchObject(o, r) }));
    while (pending.length) {
      // nearest object start
      let bi = 0, bd = Infinity;
      if (!options.preserveObjectOrder) pending.forEach((p, i) => { const s = p.runs[0]?.[0]; if (s) { const d = dist(pos, s); if (d < bd) { bd = d; bi = i; } } });
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
