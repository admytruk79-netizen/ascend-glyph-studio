import type {FeatureVector} from "./originality";
import type {PrimitiveKind} from "./grammar";

export interface MorphologyObservation{
 sourceId:string; artifactId?:string; formId?:string; region?:string; period?:string;
 primitive:PrimitiveKind; confidence:number; count?:number;
 symmetry?:"bilateral"|"radial"|"translational"|"asymmetric-balanced";
 relationships?:Array<{kind:"contains"|"frames"|"alternates"|"mirrors"|"branches_from"|"transitions_to"|"repeats_along"|"centers_on";to:PrimitiveKind;confidence:number}>;
 culturalAccess?:string;
}
export interface MorphologyAnalysis{
 sourceId:string;features:FeatureVector;dominant:PrimitiveKind[];symmetry:Record<string,number>;
 relationshipCount:number;confidence:number;culturalRisk:"low"|"review"|"blocked";
}
const keys:PrimitiveKind[]=["axis","branch","enclosure","step","pulse","chevron","band","lattice","meander","rosette"];
const blank=():FeatureVector=>({axis:0,enclosure:0,branch:0,step:0,pulse:0,chevron:0,band:0,lattice:0,meander:0,radial:0});
const fvKey=(p:PrimitiveKind):keyof FeatureVector=>p==="rosette"?"radial":p==="arc"?"pulse":p;
export function analyzeMorphology(rows:MorphologyObservation[]):MorphologyAnalysis[]{
 const by=new Map<string,MorphologyObservation[]>();for(const r of rows)by.set(r.sourceId,[...(by.get(r.sourceId)??[]),r]);
 return [...by].map(([sourceId,xs])=>{const raw=blank();let total=0,weightedConfidence=0,relationshipCount=0;const symmetry:Record<string,number>={};
  for(const x of xs){const n=Math.max(1,x.count??1),w=n*Math.max(0,Math.min(1,x.confidence));raw[fvKey(x.primitive)]+=w;total+=w;weightedConfidence+=x.confidence*n;relationshipCount+=x.relationships?.length??0;if(x.symmetry)symmetry[x.symmetry]=(symmetry[x.symmetry]??0)+w}
  const max=Math.max(1,...Object.values(raw));for(const k of Object.keys(raw) as Array<keyof FeatureVector>)raw[k]=Number((raw[k]/max).toFixed(4));
  const dominant=keys.filter(k=>raw[fvKey(k)]>=.55).sort((a,b)=>raw[fvKey(b)]-raw[fvKey(a)]);
  const accesses=xs.map(x=>(x.culturalAccess??"open").toLowerCase()),blocked=accesses.some(x=>["restricted","sacred","prohibited"].includes(x)),review=!blocked&&accesses.some(x=>["review","sensitive","nation-specific"].includes(x));
  return{sourceId,features:raw,dominant,symmetry,relationshipCount,confidence:Number((weightedConfidence/Math.max(1,xs.reduce((n,x)=>n+Math.max(1,x.count??1),0))).toFixed(4)),culturalRisk:blocked?"blocked":review?"review":"low"};
 });
}
export function aggregateMorphology(xs:MorphologyAnalysis[]):FeatureVector{const out=blank();if(!xs.length)return out;for(const x of xs)for(const k of Object.keys(out) as Array<keyof FeatureVector>)out[k]+=x.features[k]*x.confidence;const denom=Math.max(.0001,xs.reduce((n,x)=>n+x.confidence,0));for(const k of Object.keys(out) as Array<keyof FeatureVector>)out[k]=Number((out[k]/denom).toFixed(4));return out}
