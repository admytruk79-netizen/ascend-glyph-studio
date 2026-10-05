import { EngineIntent } from "./core";import { generateCandidates } from "./candidates";import { EvidenceObservation,PrincipleSignal,deriveAuditedGrammar } from "./grammar";
export interface AblationResult{principleId:string;baselineScore:number;ablatedScore:number;scoreDelta:number;geometryChanged:boolean;grammarChanged:boolean;meaningful:boolean}
const sig=(x:ReturnType<typeof generateCandidates>[number])=>x.zones.map(z=>z.svg).join("|");
export function ablateResearchPrinciples(intent:EngineIntent,principles:PrincipleSignal[],observations:EvidenceObservation[]):AblationResult[]{
 const baseGrammar=deriveAuditedGrammar(principles,observations),base=generateCandidates(intent,1,baseGrammar)[0];if(!base)return[];
 const baseRules=baseGrammar.rules.map(r=>r.id+":"+r.weight).join("|");
 return intent.principleIds.map(principleId=>{const ps=principles.filter(p=>p.id!==principleId),obs=observations.filter(o=>o.principleId!==principleId),ids=intent.principleIds.filter(x=>x!==principleId);
  if(!ids.length)return{principleId,baselineScore:base.score,ablatedScore:base.score,scoreDelta:0,geometryChanged:false,grammarChanged:false,meaningful:false};
  const grammar=deriveAuditedGrammar(ps,obs),alt=generateCandidates({...intent,principleIds:ids},1,grammar)[0];if(!alt)return{principleId,baselineScore:base.score,ablatedScore:0,scoreDelta:base.score,geometryChanged:true,grammarChanged:true,meaningful:true};
  const delta=Number((base.score-alt.score).toFixed(4)),geometryChanged=sig(base)!==sig(alt),grammarChanged=baseRules!==grammar.rules.map(r=>r.id+":"+r.weight).join("|");
  return{principleId,baselineScore:base.score,ablatedScore:alt.score,scoreDelta:delta,geometryChanged,grammarChanged,meaningful:grammarChanged&&(geometryChanged||Math.abs(delta)>=.03)}
 })}
