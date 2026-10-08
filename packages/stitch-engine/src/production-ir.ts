import type {DesignObject,Plan} from "./plan.js";
import {plan} from "./plan.js";
import type {StitchRecipe} from "./recipes.js";
import {estimateProductionMath,measureRealizedStitches,type ProductionMathEstimate} from "./production-math.js";
import {estimateMinutes,runGate,type GateResult,type GateLimits} from "./gate.js";

export type ProductionStitchIrObject=DesignObject;

export interface CompiledProductionIr{
 objects:DesignObject[];
 plan:Plan;
 math:ProductionMathEstimate;
 realized:{stitchCount:number;stitchedPathMm:number;averageStitchMm:number};
 minutes:number;
 gate:GateResult;
}

/**
 * Final neutral-IR → embroidery-plan bridge.
 * The caller supplies already solved physical geometry. This function does not
 * reinterpret semantic meaning or SVG; it only digitizes against a material
 * recipe and machine envelope.
 */
export function compileProductionIr(
 objects:ProductionStitchIrObject[],
 recipe:StitchRecipe,
 machine:GateLimits
):CompiledProductionIr{
 const normalized=objects.map(o=>structuredClone(o)) as DesignObject[];
 const stitchPlan=plan(normalized,recipe);
 const math=estimateProductionMath(normalized,recipe,1);
 const realized=measureRealizedStitches(stitchPlan.commands);
 const minutes=estimateMinutes(stitchPlan,recipe.speedSpm);
 const gate=runGate(normalized,stitchPlan.commands,recipe,machine,minutes);
 return {objects:normalized,plan:stitchPlan,math:{...math,predictedStitches:math.predictedStitches},realized,minutes,gate};
}
