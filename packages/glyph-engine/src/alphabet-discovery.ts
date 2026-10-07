import type {MorphologyAnalysis} from "./morphology";
import type {AlphabetPrimitive} from "./alphabet";

export interface CorpusPrimitiveContext{
 objectId:string;sourceGroup:string;region?:string;tradition?:string;
}

export function discoveredAlphabetCandidates(
 analyses:Array<{analysis:MorphologyAnalysis;context:CorpusPrimitiveContext}>
):AlphabetPrimitive[]{
 const primitives=["axis","branch","enclosure","step","pulse","chevron","band","lattice","meander","rosette"] as const;
 return primitives.flatMap(primitive=>{
  const supporting=analyses.filter(x=>x.analysis.features[primitive==="rosette"?"radial":primitive]>=.55);
  if(!supporting.length)return[];
  const confidence=supporting.reduce((n,x)=>n+x.analysis.confidence,0)/supporting.length;
  const culturalRisk=supporting.some(x=>x.analysis.culturalRisk==="blocked")?"blocked":supporting.some(x=>x.analysis.culturalRisk==="review")?"review":"low";
  return[{id:`universal-${primitive}`,label:primitive.replace(/(^|-)([a-z])/g,(_,a,b)=>a+b.toUpperCase()),version:1,origin:"universal-discovered",state:"candidate",morphology:primitive,evidence:{
   sourceIds:supporting.map(x=>x.context.objectId),
   sourceGroups:[...new Set(supporting.map(x=>x.context.sourceGroup))],
   regions:[...new Set(supporting.map(x=>x.context.region).filter((x):x is string=>!!x))],
   traditions:[...new Set(supporting.map(x=>x.context.tradition).filter((x):x is string=>!!x))],
   confidence:Number(confidence.toFixed(4)),culturalRisk
  }} satisfies AlphabetPrimitive];
 });
}
