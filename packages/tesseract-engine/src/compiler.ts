import type {DesignGenome,GenomeRule} from "./genome";import type {GarmentSurface,MachineEnvelope,ProjectionPlan} from "./manufacturing";import {planEmbroidery} from "./manufacturing";
export type ProcessKind="machine-embroidery"|"screen-print"|"dtg"|"leather-tooling"|"laser-engraving";
export type Capability={minStrokeMm:number;minGapMm:number;maxDensity?:number;maxDetailPer100mm?:number};
export type CompileRequest={genome:DesignGenome;surface:GarmentSurface;machine:MachineEnvelope;process:ProcessKind;bandWidthMm:number;requestedStrokeMm:number;requestedGapMm:number;capability:Capability};
export type Adaptation={feature:string;from:number;to:number;reason:string;allowed:boolean};
export type CompiledDesign={plan:ProjectionPlan;strokeMm:number;gapMm:number;adaptations:Adaptation[];valid:boolean;errors:string[]};
function rule(g:DesignGenome,f:string):GenomeRule|undefined{return g.rules.find(r=>r.feature===f)}
function adapt(g:DesignGenome,f:string,from:number,to:number,reason:string):Adaptation{
 const r=rule(g,f),allowed=!r||r.invariance==="elastic"||r.invariance==="medium-specific"||(r.invariance==="constrained"&&(r.min===undefined||to>=r.min)&&(r.max===undefined||to<=r.max));
 return {feature:f,from,to,reason,allowed};
}
export function compileManufacturing(r:CompileRequest):CompiledDesign{
 const plan=planEmbroidery(r.surface,r.machine,r.bandWidthMm),adaptations:Adaptation[]=[];
 const stroke=Math.max(r.requestedStrokeMm,r.capability.minStrokeMm),gap=Math.max(r.requestedGapMm,r.capability.minGapMm);
 if(stroke!==r.requestedStrokeMm)adaptations.push(adapt(r.genome,"stroke-width",r.requestedStrokeMm,stroke,"process-minimum-stroke"));
 if(gap!==r.requestedGapMm)adaptations.push(adapt(r.genome,"spacing",r.requestedGapMm,gap,"process-minimum-gap"));
 const errors:string[]=[];if(plan.mode==="unsupported")errors.push(...plan.reasons);for(const a of adaptations)if(!a.allowed)errors.push("immutable-or-out-of-range:"+a.feature);
 return {plan,strokeMm:stroke,gapMm:gap,adaptations,valid:errors.length===0,errors};
}
