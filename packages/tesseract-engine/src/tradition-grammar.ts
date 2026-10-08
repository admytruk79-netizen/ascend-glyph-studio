import type {ImageObservation} from "./image-corpus";
import {trainingWeight} from "./image-corpus";
import type {VisualFeatureVector} from "./visual-features";
import {observationVector} from "./visual-features";

export type TraditionGrammarProfile={
 tradition:string;centroid:VisualFeatureVector;support:number;weight:number;
 sources:string[];operations:string[];directions:string[];
 provenance:{observationIds:string[]};
};

const KEYS:(keyof VisualFeatureVector)[]=["symmetry","density","voidRatio","scaleLevels","vertical","horizontal","radial","field","wrap","branching","repetition","interruption","closure","densityVariation","directionalEntropy","axisStrength","rotation180","periodicity","focalDominance","asymmetryBalance","motifFieldRatio","compositionalDepth","embroideryComplexity"];
const zero=()=>Object.fromEntries(KEYS.map(k=>[k,0])) as VisualFeatureVector;
const traditionOf=(o:ImageObservation)=>o.tradition??o.notes?.[1]??"unknown";

export function deriveTraditionGrammarProfiles(observations:ImageObservation[]):TraditionGrammarProfile[]{
 const groups=new Map<string,ImageObservation[]>();
 for(const o of observations){
  if(!o.verifiedReal||o.trainingUse==="negative-example")continue;
  const t=String(traditionOf(o));if(t==="unknown")continue;
  groups.set(t,[...(groups.get(t)??[]),o]);
 }
 return [...groups.entries()].map(([tradition,xs])=>{
  const centroid=zero();let total=0;
  for(const o of xs){const w=trainingWeight(o),v=observationVector(o);total+=w;for(const k of KEYS)centroid[k]+=v[k]*w}
  if(total>0)for(const k of KEYS)centroid[k]/=total;
  return {tradition,centroid,support:xs.length,weight:total,
   sources:[...new Set(xs.map(o=>o.sourceRef||o.provenance||o.id))],
   operations:[...new Set(xs.flatMap(o=>o.features.operations??[]))],
   directions:[...new Set(xs.flatMap(o=>o.features.dominantDirection??[]))],
   provenance:{observationIds:xs.map(o=>o.id)}
  };
 }).sort((a,b)=>b.weight-a.weight);
}

export function blendTraditionGrammarProfiles(profiles:TraditionGrammarProfile[],mix:Record<string,number>):VisualFeatureVector{
 const out=zero();let total=0;
 for(const p of profiles){const w=Math.max(0,mix[p.tradition]??0);if(!w)continue;total+=w;for(const k of KEYS)out[k]+=p.centroid[k]*w}
 if(total>0)for(const k of KEYS)out[k]/=total;
 return out;
}
