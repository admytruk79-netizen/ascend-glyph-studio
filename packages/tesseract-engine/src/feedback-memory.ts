import type {Topology} from "./topology";
import type {MediumId,ProductionLimits} from "./medium-compiler";
import type {PhysicalValidation} from "./physical-feedback";
import {validationPenalty} from "./physical-feedback";

export type FeedbackSignature={medium:MediumId;substrateId?:string;machineProfileId?:string;forms:string[];relations:string[]};
export type FeedbackMatch={validation:PhysicalValidation;similarity:number;penalty:number};

const jaccard=(a:string[],b:string[])=>{const A=new Set(a),B=new Set(b),u=new Set([...A,...B]).size;if(!u)return 1;let i=0;for(const x of A)if(B.has(x))i++;return i/u};

export function topologyFeedbackSignature(t:Topology,medium:MediumId,substrateId?:string,machineProfileId?:string):FeedbackSignature{
 return {medium,substrateId,machineProfileId,forms:[...new Set(t.nodes.map(n=>n.form))],relations:[...new Set(t.edges.map(e=>e.relation))]};
}
export function matchPhysicalHistory(sig:FeedbackSignature,history:(PhysicalValidation&{forms?:string[];relations?:string[]})[]):FeedbackMatch[]{
 return history.filter(v=>v.medium===sig.medium).map(v=>{
  let similarity=.45;
  if(sig.substrateId&&v.substrateId===sig.substrateId)similarity+=.15;
  if(sig.machineProfileId&&v.machineProfileId===sig.machineProfileId)similarity+=.15;
  similarity+=.125*jaccard(sig.forms,v.forms??[])+.125*jaccard(sig.relations,v.relations??[]);
  return {validation:v,similarity:Math.min(1,similarity),penalty:validationPenalty(v)};
 }).filter(x=>x.similarity>=.55).sort((a,b)=>b.similarity-a.similarity);
}
export function feedbackRisk(sig:FeedbackSignature,history:(PhysicalValidation&{forms?:string[];relations?:string[]})[]){
 const m=matchPhysicalHistory(sig,history).slice(0,8);if(!m.length)return {risk:0,confidence:0,matches:m};
 const w=m.reduce((s,x)=>s+x.similarity,0);return {risk:m.reduce((s,x)=>s+x.penalty*x.similarity,0)/w,confidence:Math.min(1,w/4),matches:m};
}
