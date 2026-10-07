import type { Plan } from "./plan.js";
import type { StitchRecipe } from "./recipes.js";
import type { GateResult } from "./gate.js";
import type { WrapFit } from "./wrap.js";
import { bounds } from "./geometry.js";

export interface RunSheet {
  designId: string; revision: string; size?: string; zone: string;
  file: string; format: "DST"; stitches: number; colorChanges: number; trims: number;
  estMinutes: number; extentMm: { width: number; height: number };
  threads: { block: number; color: string }[];
  recipe: Pick<StitchRecipe, "id" | "material" | "needle" | "stabilizer" | "topping" | "speedSpm">;
  wrap?: WrapFit; compensation: { scaleX: number; scaleY: number };
  gate: GateResult;
  qc: string[];
}

/** Run time ≈ stitches ÷ speed + colour changes × 10 s + trims × 5 s. */
export function estimateMinutes(p: Plan, speedSpm: number): number {
  const stitches = p.commands.filter((c) => c.cmd === "stitch").length;
  return stitches / speedSpm + ((p.colors.length - 1) * 10 + p.trims * 5) / 60;
}

export function runSheet(a: Omit<RunSheet, "stitches" | "colorChanges" | "trims" | "estMinutes" | "extentMm" | "threads" | "qc" | "recipe" | "format"> & { plan: Plan; r: StitchRecipe }): RunSheet {
  const { plan, r, ...rest } = a;
  const pts = plan.commands.filter((c) => c.cmd === "stitch");
  const b = bounds(pts);
  return {
    ...rest, format: "DST",
    stitches: pts.length, colorChanges: plan.colors.length - 1, trims: plan.trims,
    estMinutes: +estimateMinutes(plan, r.speedSpm).toFixed(1),
    extentMm: { width: +(b.maxX - b.minX).toFixed(1), height: +(b.maxY - b.minY).toFixed(1) },
    threads: plan.colors.map((color, i) => ({ block: i + 1, color })),
    recipe: { id: r.id, material: r.material, needle: r.needle, stabilizer: r.stabilizer, topping: r.topping, speedSpm: r.speedSpm },
    qc: ["dimensions within ±1 mm of extent", "registration of outlines to fills", "no puckering after unhooping", "no thread breaks or birdnests", "band closes at seam on a void / segment boundary"],
  };
}
