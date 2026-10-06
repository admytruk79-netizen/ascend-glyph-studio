import type {PrimitiveKind} from "./grammar";

export type AlphabetOrigin="ascend-native"|"universal-discovered"|"tesseract-evolved";
export type AlphabetState="candidate"|"evidence-qualified"|"human-approved"|"canonical";

export interface AlphabetEvidence{
 sourceIds:string[];
 sourceGroups:string[];
 regions:string[];
 traditions:string[];
 confidence:number;
 culturalRisk:"low"|"review"|"blocked";
 directMotifSimilarity?:number;
}

export interface AlphabetPrimitive{
 id:string;label:string;version:number;origin:AlphabetOrigin;state:AlphabetState;
 morphology?:PrimitiveKind;geometryRef?:string;parentIds?:string[];
 evidence?:AlphabetEvidence;approvedBy?:string;notes?:string;
}

export interface PromotionPolicy{
 minSources:number;minSourceGroups:number;minRegions:number;minTraditions:number;
 minConfidence:number;maxDirectMotifSimilarity:number;
}

export const DEFAULT_PROMOTION_POLICY:PromotionPolicy={
 minSources:12,minSourceGroups:4,minRegions:3,minTraditions:5,
 minConfidence:.72,maxDirectMotifSimilarity:.72
};

export interface PromotionDecision{eligible:boolean;reasons:string[]}

export function evaluateAlphabetPromotion(p:AlphabetPrimitive,policy=DEFAULT_PROMOTION_POLICY):PromotionDecision{
 const reasons:string[]=[];
 if(p.origin==="ascend-native"){
  if(!p.geometryRef)reasons.push("canonical source geometry required");
  return{eligible:reasons.length===0,reasons};
 }
 const e=p.evidence;
 if(!e)return{eligible:false,reasons:["evidence required"]};
 if(e.culturalRisk!=="low")reasons.push(e.culturalRisk==="blocked"?"culturally blocked":"cultural review required");
 if(new Set(e.sourceIds).size<policy.minSources)reasons.push("insufficient independent objects");
 if(new Set(e.sourceGroups).size<policy.minSourceGroups)reasons.push("insufficient source-group diversity");
 if(new Set(e.regions).size<policy.minRegions)reasons.push("insufficient regional diversity");
 if(new Set(e.traditions).size<policy.minTraditions)reasons.push("insufficient tradition diversity");
 if(e.confidence<policy.minConfidence)reasons.push("insufficient structural confidence");
 if((e.directMotifSimilarity??0)>policy.maxDirectMotifSimilarity)reasons.push("too similar to a direct source motif");
 if(p.origin==="tesseract-evolved"&&!(p.parentIds?.length))reasons.push("evolution lineage required");
 return{eligible:reasons.length===0,reasons};
}

export function promoteAlphabetPrimitive(p:AlphabetPrimitive,approvedBy:string):AlphabetPrimitive{
 const decision=evaluateAlphabetPromotion(p);
 if(!decision.eligible)throw new Error(`alphabet-promotion-rejected:${p.id}:${decision.reasons.join("|")}`);
 if(!approvedBy.trim())throw new Error("alphabet-promotion-human-approval-required");
 return{...p,state:"human-approved",approvedBy};
}

export const ASCEND_NATIVE_ALPHABET:readonly AlphabetPrimitive[]=[
 ["seed","Seed"],["line","Line"],["axis","Axis"],["torus","Torus"],["orbit","Orbit"],
 ["branch","Branch"],["crossing","Crossing"],["opposition","Opposition"],
 ["radial-emission","Radial Emission"],["void","Void"]
].map(([id,label])=>({id:id!,label:label!,version:1,origin:"ascend-native" as const,state:"candidate" as const}));
