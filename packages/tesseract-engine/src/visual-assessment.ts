import type {ImageObservation} from "./image-corpus";
import {trainingWeight} from "./image-corpus";
import type {VisualFeatureVector} from "./visual-features";
import {nearestObservations} from "./visual-features";

export type VisualAssessment={
 novelty:number;derivativeRisk:number;genericRisk:number;evidenceSupport:number;
 nearest:{id:string;distance:number;weight:number;class:string}[];
 flags:string[];
};
export function assessVisual(v:VisualFeatureVector,corpus:ImageObservation[]):VisualAssessment{
 const near=nearestObservations(v,corpus,10),flags:string[]=[];
 const weighted=near.map(x=>({...x,w:trainingWeight(x.observation)}));
 const strong=weighted.filter(x=>x.w>=.7);
 const minStrong=strong.length?Math.min(...strong.map(x=>x.distance)):1;
 const minAny=weighted.length?weighted[0]!.distance:1;
 const derivativeRisk=Math.max(0,1-minStrong*2.2);
 const genericRisk=Math.max(0,Math.min(1,(v.symmetry*.3+v.repetition*.3+(1-v.interruption)*.2+(1-v.voidRatio)*.2)));
 const evidenceSupport=strong.length?strong.reduce((s,x)=>s+x.w*(1-x.distance),0)/strong.length:0;
 const novelty=Math.max(0,Math.min(1,minAny*.75+(1-genericRisk)*.25));
 if(derivativeRisk>.78)flags.push("too-close-to-high-confidence-reference");
 if(genericRisk>.72)flags.push("generic-pattern-risk");
 if(v.symmetry>.82&&v.repetition>.7)flags.push("symmetry-repeat-saturation");
 if(v.voidRatio<.15)flags.push("insufficient-negative-space");
 if(evidenceSupport<.2)flags.push("weak-corpus-support");
 return {novelty,derivativeRisk,genericRisk,evidenceSupport,nearest:weighted.slice(0,5).map(x=>({id:x.observation.id,distance:x.distance,weight:x.w,class:x.observation.class})),flags};
}
