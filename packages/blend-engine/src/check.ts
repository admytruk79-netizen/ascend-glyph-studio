/**
 * Self-checks: (1) the deconstruction analyser must read back the symmetry group the generator meant;
 * (2) the stitch engine's fail-closed gate must accept the design on the target material.
 */
import { classifyFriezeGroup } from "../../../scripts/corpus/deconstruct.ts";
import { estimateMinutes, plan, recipes, runGate, type DesignObject, type GateResult } from "../../stitch-engine/src/index.ts";
import type { Candidate } from "./generate.js";
import { rasterize } from "./raster.js";

export function readBackGroup(c: Candidate, height: number): { group: string; scores: Record<string, number> } {
  const motifs = c.shapes.filter((s) => s.role === "motif").map((s) => s.poly);
  const ys = motifs.flatMap((p) => p.map((q) => q.y));
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const inner = y1 - y0;
  const n = Math.min(4, Math.floor(c.repeats / 2));
  const scale = 96 / inner; // ~96 px across the band
  const w = Math.round(n * c.period * scale), h = Math.round(inner * scale) + 8;
  const img = rasterize(motifs, w, h, scale, 0, y0 - 4 / scale);
  const f = classifyFriezeGroup(img, w, h, c.period * scale);
  return { group: f.group, scores: f.scores };
}

export function toDesignObjects(c: Candidate): DesignObject[] {
  return c.shapes.map((s, i) => s.role === "rail"
    ? { kind: "satin" as const, id: `${s.id}`, color: s.color, path: s.poly, width: 2.2 }
    : { kind: "fill" as const, id: `${s.id}-${i}`, color: s.color, polygon: s.poly, angle: s.role === "event" ? 0 : i % 2 ? 45 : -45 });
}

export function feasibility(c: Candidate, recipeId = "linen-180-prewashed"): { gate: GateResult; stitches: number; minutes: number; commands: ReturnType<typeof plan>["commands"]; colors: string[] } {
  const r = recipes[recipeId]!;
  const objs = toDesignObjects(c);
  const p = plan(objs, r);
  const minutes = estimateMinutes(p, r.speedSpm);
  const gate = runGate(objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 }, maxStitches: 60000, maxMinutes: 60 }, minutes);
  return { gate, stitches: p.commands.filter((x) => x.cmd === "stitch").length, minutes, commands: p.commands, colors: p.colors };
}
