import type {PhysicalValidation} from "./physical-feedback";
import {deriveCorrectionSignals} from "./physical-feedback";
import type {ProductionLimits,MediumId} from "./medium-compiler";
import {DEFAULT_LIMITS} from "./medium-compiler";

export type LearnedLimits=ProductionLimits&{sampleCount:number;confidence:number;provenance:string[]};
export function learnProductionLimits(medium:MediumId,validations:PhysicalValidation[],base:ProductionLimits=DEFAULT_LIMITS[medium]):LearnedLimits{
 const relevant=validations.filter(v=>v.medium===medium&&["measured","reviewed","production-validated"].includes(v.status));
 let minFeature=base.minFeatureMm,minGap=base.minGapMm,maxDensity=base.maxDensity,weight=0;const provenance:string[]=[];
 for(const v of relevant){const c=v.status==="production-validated"?1:v.status==="reviewed"?.85:.7;weight+=c;provenance.push(v.id);
  const a=v.actual;
  if(a.featureMm!=null&&v.defects.some(d=>["thread-crowding","edge-fray","fill-collapse"].includes(d.type)))minFeature=Math.max(minFeature,a.featureMm+c*.15);
  if(a.gapMm!=null&&v.defects.some(d=>["gap-loss","emboss-fill-in","tooling-bridge"].includes(d.type)))minGap=Math.max(minGap,a.gapMm+c*.15);
  if(a.density!=null&&v.defects.some(d=>["thread-crowding","fill-collapse"].includes(d.type)))maxDensity=Math.min(maxDensity,Math.max(.15,a.density-c*.04));
 }
 return {...base,minFeatureMm:minFeature,minGapMm:minGap,maxDensity,sampleCount:relevant.length,confidence:relevant.length?Math.min(1,weight/5):0,provenance};
}
export function feedbackSummary(validations:PhysicalValidation[]){return validations.flatMap(deriveCorrectionSignals);}
