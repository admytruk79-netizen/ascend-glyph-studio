import type {ImageObservation} from "./image-corpus";
import {trainingWeight,validateObservation} from "./image-corpus";
import type {LearnedRelationPrior} from "./learned-relation-prior";

/**
 * Fit a transparent, evidence-weighted compositional prior from analyzed image observations.
 * No pixels or motifs are copied. This is statistical fitting, not neural image-model training.
 * Restrict to verified, provenanced real observations approved for composition analysis.
 */
export function fitCompositionPrior(observations:ImageObservation[],minimumEvidence=3):LearnedRelationPrior|undefined{
 const seen=new Set<string>();
 const accepted=observations.filter(o=>{
  if(!o.verifiedReal||o.trainingUse!=="composition"||validateObservation(o).length)return false;
  if(!o.provenance?.trim()||!o.sourceRef.trim())return false;
  const key=o.sourceRef.trim();
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
 if(accepted.length<minimumEvidence)return undefined;
 let sum=0,mirror=0,repeat=0,scale=0,explore=0;
 const relationWeights:Record<string,number>={};
 const operationMap:Record<string,string>={repeat:"repeat",mirror:"oppose",branch:"branch",nest:"nest",cross:"intersect",interrupt:"terminate",rotate:"transform",surround:"enclose",alternate:"flow",return:"return",radiate:"radiate",layer:"nest"};
 const bound=(x:number,otherwise:number)=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):otherwise;
 for(const o of accepted){
  const weight=trainingWeight(o);
  sum+=weight;
  const ft=o.features;
  mirror+=bound(ft.symmetry??NaN,.5)*weight;
  repeat+=bound(ft.periodicity??NaN,.5)*weight;
  scale+=Math.max(1,Math.min(5,ft.scaleLevels??2))*weight;
  explore+=(bound(ft.directionalEntropy??NaN,.5)+bound(ft.asymmetryBalance??NaN,.5))/2*weight;
  const unique=new Set((ft.operations??[]).map(v=>operationMap[v.toLowerCase()]).filter((x):x is string=>!!x));
  for(const relation of unique)relationWeights[relation]=(relationWeights[relation]??0)+weight;
 }
 if(sum<=0)return undefined;
 for(const key of Object.keys(relationWeights))relationWeights[key]=Number((relationWeights[key]!/sum).toFixed(6));
 return {
  relationWeights,
  preferredScaleRatio:Number((1/Math.sqrt(scale/sum)).toFixed(4)),
  mirrorStrength:Number((mirror/sum).toFixed(4)),
  repeatStrength:Number((repeat/sum).toFixed(4)),
  exploration:Number((explore/sum).toFixed(4)),
  evidenceImages:accepted.length,
  sourceModel:"evidence-weighted-composition-prior-v1"
 };
}
