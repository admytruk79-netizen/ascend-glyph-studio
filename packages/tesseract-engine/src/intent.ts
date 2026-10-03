import type {IntentVector,WeightedRef} from "./dimensions";

export type SemanticStep={conceptId:string;weight:number;operation:"originate"|"continue"|"branch"|"oppose"|"cross"|"protect"|"transform"|"vanish"|"return"|"ascend"};
export type IntentPlan={intent:IntentVector;semanticSkeleton:SemanticStep[];exclusions:Set<string>};

const operationHints:Record<string,SemanticStep["operation"]>={
 origin:"originate",ancestry:"continue",lineage:"branch",freedom:"cross",will:"continue",courage:"oppose",
 protection:"protect",transformation:"transform",death:"vanish",return:"return",renewal:"return",ascent:"ascend",
 journey:"continue",choice:"branch",brotherhood:"branch",perception:"cross"
};

function stable(xs:WeightedRef[]){return [...xs].sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id));}

export function compileIntent(intent:IntentVector):IntentPlan{
 if(!intent.concepts.length)throw new Error("intent-requires-concepts");
 const semanticSkeleton=stable(intent.concepts).map(c=>({
  conceptId:c.id,weight:c.weight,operation:operationHints[c.id.toLowerCase()]??"continue"
 }));
 return {intent:{...intent,concepts:stable(intent.concepts)},semanticSkeleton,exclusions:new Set(intent.exclusions??[])};
}
