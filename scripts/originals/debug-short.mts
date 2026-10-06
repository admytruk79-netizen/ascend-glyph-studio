import { plan, recipes, dist } from "../../packages/stitch-engine/src/index.ts";
export function shortByType(objs: any[]) {
  const r = recipes["linen-180-prewashed"]!; const seen: Record<string, number> = {};
  for (const o of objs) { const p = plan([o], r); let prev: any;
    for (const x of p.commands) { if (x.cmd === "stitch" && prev?.cmd === "stitch") { const d = dist(prev, x); if (!x.tie && !prev.tie && !x.turn && d > 0.05 && d < 1) { const k = o.kind + ":" + o.id.split("-")[0]; seen[k] = (seen[k] ?? 0) + 1; } } if (x.cmd === "stitch" || x.cmd === "jump") prev = x; } }
  return seen;
}
