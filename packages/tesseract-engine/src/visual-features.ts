import type {ImageObservation} from "./image-corpus";
export type VisualFeatureVector={
 symmetry:number;density:number;voidRatio:number;scaleLevels:number;vertical:number;horizontal:number;radial:number;field:number;wrap:number;
 branching:number;repetition:number;interruption:number;closure:number;densityVariation:number;directionalEntropy:number;axisStrength:number;rotation180:number;
 periodicity:number;focalDominance:number;asymmetryBalance:number;motifFieldRatio:number;compositionalDepth:number;embroideryComplexity:number;
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function observationVector(o:ImageObservation):VisualFeatureVector{
 const d=o.features.dominantDirection??[],ops=o.features.operations??[],f=o.features;
 return {symmetry:clamp(f.symmetry??.5),density:clamp(f.density??.5),voidRatio:clamp(f.voidRatio??.5),scaleLevels:clamp((f.scaleLevels??1)/6),
 vertical:+d.includes("vertical"),horizontal:+d.includes("horizontal"),radial:+d.includes("radial"),field:+d.includes("field"),wrap:+d.includes("wrap"),
 branching:+ops.includes("branch"),repetition:+ops.includes("repeat"),interruption:+ops.includes("interrupt"),closure:+(ops.includes("return")||ops.includes("enclose")),
 densityVariation:clamp(f.densityVariation??.5),directionalEntropy:clamp(f.directionalEntropy??.5),axisStrength:clamp(f.axisStrength??.5),rotation180:clamp(f.rotation180??.5),
 periodicity:clamp(f.periodicity??.5),focalDominance:clamp(f.focalDominance??.5),asymmetryBalance:clamp(f.asymmetryBalance??.5),motifFieldRatio:clamp(f.motifFieldRatio??.5),
 compositionalDepth:clamp(f.compositionalDepth??.5),embroideryComplexity:clamp(f.embroideryComplexity??.5)};
}
const weights:Partial<Record<keyof VisualFeatureVector,number>>={scaleLevels:1.35,voidRatio:1.25,densityVariation:1.3,directionalEntropy:1.2,periodicity:1.25,focalDominance:1.5,asymmetryBalance:1.25,motifFieldRatio:1.25,compositionalDepth:1.55,embroideryComplexity:1.35,repetition:1.2,interruption:1.3};
export function visualDistance(a:VisualFeatureVector,b:VisualFeatureVector){const ks=Object.keys(a) as (keyof VisualFeatureVector)[];let s=0,w=0;for(const k of ks){const x=weights[k]??1;s+=x*(a[k]-b[k])**2;w+=x}return Math.sqrt(s/Math.max(1,w))}
export function nearestObservations(v:VisualFeatureVector,corpus:ImageObservation[],limit=8){return corpus.map(o=>({observation:o,distance:visualDistance(v,observationVector(o))})).sort((a,b)=>a.distance-b.distance).slice(0,limit)}
