import { ResearchSnapshot } from "./research-engine";
export interface IntegrityReport{ok:boolean;errors:string[];warnings:string[];stats:Record<string,number>}
const blocked=(x:string)=>["restricted","sacred","prohibited"].includes(x.toLowerCase());
export function checkResearchIntegrity(r:ResearchSnapshot):IntegrityReport{
 const errors:string[]=[],warnings:string[]=[];
 const ids=new Set(r.principles.map(p=>p.id)),sourceIds=new Set(r.sources.map(s=>s.id)),seen=new Set<string>();
 for(const p of r.principles){
  if(seen.has(p.id))errors.push(`duplicate principle ${p.id}`);seen.add(p.id);
  if(!p.label.trim())errors.push(`unlabelled principle ${p.id}`);
  if(!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1)errors.push(`invalid confidence ${p.id}`);
  if(blocked(p.culturalAccess))warnings.push(`blocked cultural principle present ${p.id}`);
 }
 const evidenceKeys=new Set<string>();
 for(const o of r.observations){
  if(!ids.has(o.principleId))errors.push(`orphan evidence principle ${o.principleId}`);
  if(!sourceIds.has(o.sourceId))errors.push(`orphan evidence source ${o.sourceId}`);
  if(!Number.isFinite(o.confidence)||o.confidence<0||o.confidence>1)errors.push(`invalid evidence confidence ${o.principleId}`);
  const k=`${o.principleId}|${o.sourceId}|${o.region??""}|${o.period??""}|${o.stance}`;
  if(evidenceKeys.has(k))warnings.push(`duplicate evidence observation ${k}`);evidenceKeys.add(k);
 }
 for(const p of r.principles){
  const xs=r.observations.filter(o=>o.principleId===p.id);
  if(!xs.length)warnings.push(`principle has no evidence ${p.id}`);
  const supporting=xs.filter(o=>o.stance==="supports"),diversity=new Set(supporting.map(o=>o.sourceId)).size;
  if(supporting.length&&diversity<2)warnings.push(`principle lacks independent source diversity ${p.id}`);
  if(xs.filter(o=>o.stance==="contradicts").length>supporting.length)warnings.push(`contradiction dominates principle ${p.id}`);
 }
 return{ok:!errors.length,errors,warnings,stats:{principles:r.principles.length,observations:r.observations.length,sources:r.sources.length,uniqueEvidence:evidenceKeys.size}};
}
