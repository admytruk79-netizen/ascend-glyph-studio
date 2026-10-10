import type {ImageObservation} from "./image-corpus";
import {trainingWeight,validateObservation} from "./image-corpus";
import type {HierarchicalReconstruction,ReconstructionNode,ReconstructionRelation,TransformRule} from "./hierarchical-reconstruction";
const clamp=(x:number,d=.5)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:d));
const rule=(s:string):TransformRule|undefined=>({repeat:"repeat",mirror:"mirror",rotate:"rotate",alternate:"alternate",nest:"nest",interlock:"interlock",branch:"branch",interrupt:"interrupt",scale:"scale"} as Record<string,TransformRule>)[s];
export function inferReconstruction(observations:ImageObservation[]):HierarchicalReconstruction{
 const xs=observations.filter(o=>!validateObservation(o).length&&o.trainingUse!=="negative-example"&&(o.verifiedReal||o.class==="source-drawing"));
 if(!xs.length)throw new Error("No verified reconstruction evidence");
 const weighted=(key:keyof ImageObservation["features"],fallback=.5)=>{let s=0,w=0;for(const o of xs){const v=o.features[key];if(typeof v==="number"){const q=trainingWeight(o);s+=v*q;w+=q}}return clamp(w?s/w:fallback)};
 const axis=weighted("axisStrength"),sym=weighted("symmetry"),rot=weighted("rotation180"),voidRatio=weighted("voidRatio",.35),depth=weighted("compositionalDepth",.55),field=weighted("motifFieldRatio",.55);
 const nodes:ReconstructionNode[]=[{id:"framework",kind:axis>.62?"axis":"grid",level:"macro",weight:Math.max(axis,.4)},{id:"field",kind:"field",level:"macro",weight:field},{id:"compound",kind:depth>.62?"branch":"medallion",level:"meso",parentId:"field",weight:depth},{id:"detail",kind:"border",level:"micro",parentId:"compound",weight:weighted("densityVariation",.45)}];
 const ops=new Map<TransformRule,number>();for(const o of xs){const w=trainingWeight(o);for(const raw of o.features.operations??[]){const rr=rule(raw.toLowerCase());if(rr)ops.set(rr,(ops.get(rr)??0)+w)}}
 if(weighted("periodicity",0)>.45)ops.set("repeat",(ops.get("repeat")??0)+1);if(sym>.55)ops.set("mirror",(ops.get("mirror")??0)+1);if(rot>.55)ops.set("rotate",(ops.get("rotate")??0)+1);
 const relations:ReconstructionRelation[]=[...ops.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r],i)=>({from:i%2?"compound":"framework",to:i%2?"detail":"compound",rule:r,ratio:r==="scale"?.72:undefined}));
 const radial=(xs.reduce((n,o)=>n+(o.features.dominantDirection?.includes("radial")?trainingWeight(o):0),0)>xs.reduce((n,o)=>n+trainingWeight(o),0)*.45);
 const symmetry=radial?"radial":weighted("periodicity",0)>.62?"frieze":sym>.58?"bilateral":"none";
 return {nodes,relations,symmetry,negativeSpace:voidRatio,sourceIds:xs.map(x=>x.id)};
}
