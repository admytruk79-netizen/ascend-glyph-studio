import { EngineIntent } from "./core";import { PrincipleSignal,EvidenceObservation,deriveAuditedGrammar,evaluatePrinciple } from "./grammar";import { generateCandidates } from "./candidates";import { SourceReference,evaluateCandidates } from "./evaluation";
export interface ResearchSnapshot{principles:PrincipleSignal[];observations:EvidenceObservation[];sources:SourceReference[]}
export interface ResearchEngineResult{eligiblePrincipleIds:string[];rejectedPrinciples:{id:string;reasons:string[]}[];grammarRuleIds:string[];relationCount:number;candidates:ReturnType<typeof evaluateCandidates>}
export function runResearchDrivenEngine(intent:EngineIntent,research:ResearchSnapshot,count=8):ResearchEngineResult{
 const audits=research.principles.map(p=>evaluatePrinciple(p,research.observations)),eligible=audits.filter(a=>a.eligible).map(a=>a.principle);
 if(!eligible.length)throw new Error("no evidence-qualified principles available");
 const ids=new Set(eligible.map(p=>p.id)),filteredIntent={...intent,principleIds:intent.principleIds.filter(id=>ids.has(id))};
 if(!filteredIntent.principleIds.length)throw new Error("intent has no evidence-qualified principles");
 const grammar=deriveAuditedGrammar(eligible,research.observations);
 // Force one generation pass here so integration fails loudly if research grammar cannot render.
 generateCandidates(filteredIntent,1,grammar);
 const candidates=evaluateCandidates(filteredIntent,research.sources,count,grammar);
 return{eligiblePrincipleIds:filteredIntent.principleIds,rejectedPrinciples:audits.filter(a=>!a.eligible).map(a=>({id:a.principle.id,reasons:a.reasons})),grammarRuleIds:grammar.rules.map(r=>r.id),relationCount:grammar.relations.length,candidates};
}
