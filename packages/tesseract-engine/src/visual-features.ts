import type {ImageObservation} from "./image-corpus";

export type VisualFeatureVector={
 symmetry:number;density:number;voidRatio:number;scaleLevels:number;
 vertical:number;horizontal:number;radial:number;field:number;wrap:number;
 branching:number;repetition:number;interruption:number;closure:number;
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function observationVector(o:ImageObservation):VisualFeatureVector{
 const d=o.features.dominantDirection??[],ops=o.features.operations??[];
 return {symmetry:clamp(o.features.symmetry??.5),density:clamp(o.features.density??.5),voidRatio:clamp(o.features.voidRatio??.5),scaleLevels:clamp((o.features.scaleLevels??1)/6),
 vertical:+d.includes("vertical"),horizontal:+d.includes("horizontal"),radial:+d.includes("radial"),field:+d.includes("field"),wrap:+d.includes("wrap"),
 branching:+ops.includes("branch"),repetition:+ops.includes("repeat"),interruption:+ops.includes("interrupt"),closure:+(ops.includes("return")||ops.includes("enclose"))};
}
export function visualDistance(a:VisualFeatureVector,b:VisualFeatureVector){
 const ks=Object.keys(a) as (keyof VisualFeatureVector)[];return Math.sqrt(ks.reduce((s,k)=>s+(a[k]-b[k])**2,0)/ks.length);
}
export function nearestObservations(v:VisualFeatureVector,corpus:ImageObservation[],limit=8){
 return corpus.map(o=>({observation:o,distance:visualDistance(v,observationVector(o))})).sort((a,b)=>a.distance-b.distance).slice(0,limit);
}
