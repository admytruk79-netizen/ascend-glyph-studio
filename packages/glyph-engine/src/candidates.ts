import { EngineIntent } from "./core";import { compose } from "./grammar";import { renderComposition,RenderedZone } from "./renderer";
export interface ScoredCandidate{id:string;ordinal:number;zones:RenderedZone[];score:number;metrics:{coverage:number;ruleDiversity:number;traceability:number};rejectionReasons:string[]}
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,"0")};
export function generateCandidates(intent:EngineIntent,count=8):ScoredCandidate[]{
 if(!Number.isInteger(count)||count<1||count>32)throw new Error("candidate count must be 1..32");
 return Array.from({length:count},(_,ordinal)=>{
  const variant={...intent,seed:`${intent.seed}:${ordinal}`},plan=compose(variant),zones=intent.product.zones.map(z=>renderComposition(plan,z));
  const features=zones.flatMap(z=>z.features),unique=new Set(features.map(f=>f.ruleId)).size;
  const ruleDiversity=plan.rules.length?unique/plan.rules.length:0,traceability=features.length?features.filter(f=>f.ruleId).length/features.length:0;
  const coverage=Math.min(.95,features.length/(Math.max(1,zones.length)*20));const rejectionReasons:string[]=[];
  if(coverage>.7)rejectionReasons.push("excessive visual density");if(ruleDiversity<.5)rejectionReasons.push("insufficient rule diversity");if(traceability<1)rejectionReasons.push("incomplete provenance trace");
  const score=Math.max(0,Math.min(1,.45*ruleDiversity+.35*traceability+.20*(1-Math.abs(.35-coverage))));
  return{id:`cand-${hash(variant.seed+"|"+score)}`,ordinal,zones,score:Number(score.toFixed(4)),metrics:{coverage:Number(coverage.toFixed(4)),ruleDiversity:Number(ruleDiversity.toFixed(4)),traceability:Number(traceability.toFixed(4))},rejectionReasons};
 }).sort((a,b)=>b.score-a.score||a.ordinal-b.ordinal);
}
