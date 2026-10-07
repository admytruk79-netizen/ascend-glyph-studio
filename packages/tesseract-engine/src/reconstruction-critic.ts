import type {ImageObservation} from "./image-corpus";
import type {VisualFeatureVector} from "./visual-features";
import {trainingWeight} from "./image-corpus";

export type ReconstructionTarget={id:string;vector:VisualFeatureVector;weight:number;sourceIds:string[]};
export type ReconstructionCritique={score:number;survive:boolean;distance:number;flags:string[];target:ReconstructionTarget};

const keys:(keyof VisualFeatureVector)[]=["symmetry","density","voidRatio","scaleLevels","densityVariation","directionalEntropy","axisStrength","rotation180","periodicity","focalDominance","asymmetryBalance","motifFieldRatio","compositionalDepth","embroideryComplexity","repetition","interruption"];

export function reconstructionTarget(corpus:ImageObservation[]):ReconstructionTarget|undefined{
 const usable=corpus.filter(o=>o.trainingUse==="composition"||o.trainingUse==="geometry");
 if(!usable.length)return undefined;
 const vector={} as VisualFeatureVector;let total=0;
 for(const k of keys)(vector as any)[k]=0;
 const sourceIds:string[]=[];
 for(const o of usable){
  const w=trainingWeight(o);if(w<=0)continue;total+=w;sourceIds.push(o.id);
  for(const k of keys){const v=(o.features as any)[k];if(Number.isFinite(v))(vector as any)[k]+=v*w;}
 }
 if(!total)return undefined;
 for(const k of keys)(vector as any)[k]/=total;
 return {id:"corpus-reconstruction-target",vector,weight:total/usable.length,sourceIds};
}

export function critiqueReconstruction(candidate:VisualFeatureVector,target:ReconstructionTarget,maxDistance=.28):ReconstructionCritique{
 let weighted=0,weight=0;
 const importance:Partial<Record<keyof VisualFeatureVector,number>>={symmetry:1.2,density:1.1,voidRatio:1.1,periodicity:1.25,focalDominance:1.2,compositionalDepth:1.2,repetition:1.25,interruption:1.1,directionalEntropy:.9,axisStrength:1};
 for(const k of keys){const w=importance[k]??.7;weighted+=Math.abs((candidate as any)[k]-(target.vector as any)[k])*w;weight+=w}
 const distance=weight?weighted/weight:1,flags:string[]=[];
 if(distance>maxDistance)flags.push("reconstruction-visual-distance");
 if(candidate.repetition>.82&&candidate.interruption<.12)flags.push("reconstruction-mechanical-repeat");
 if(candidate.directionalEntropy>.82&&candidate.axisStrength<.2)flags.push("reconstruction-graph-like-directionality");
 if(candidate.compositionalDepth<.2&&candidate.focalDominance<.18)flags.push("reconstruction-weak-hierarchy");
 const score=Math.max(0,1-distance/maxDistance);
 return {score,survive:flags.length===0,distance,flags,target};
}
