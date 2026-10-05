import { EngineIntent } from "./core";

export type PrimitiveKind="axis"|"branch"|"enclosure"|"step"|"pulse"|"arc"|"chevron"|"band"|"lattice"|"meander"|"rosette";
export type PrincipleSignal={id:string;kind:string;label:string;confidence:number;culturalAccess:string;abstraction?:Record<string,unknown>};
export interface GrammarRule{id:string;primitive:PrimitiveKind;weight:number;repeatMin:number;repeatMax:number;mirror:boolean;signals:string[];minConfidence:number}
export interface Grammar{version:"0.2";rules:GrammarRule[]}
export interface CompositionPlan{seed:string;productKind:string;rules:GrammarRule[];sequence:string[];validation:string[];evidencePrincipleIds:string[]}

const RULES:GrammarRule[]=[
 {id:"axis",primitive:"axis",weight:1,repeatMin:1,repeatMax:1,mirror:false,signals:["axis","vertical","center","hierarchy"],minConfidence:.55},
 {id:"guard",primitive:"enclosure",weight:.85,repeatMin:1,repeatMax:2,mirror:true,signals:["enclosure","edge","frame","boundary","border"],minConfidence:.6},
 {id:"journey",primitive:"step",weight:.7,repeatMin:2,repeatMax:5,mirror:false,signals:["step","path","direction","transition"],minConfidence:.6},
 {id:"growth",primitive:"branch",weight:.8,repeatMin:2,repeatMax:6,mirror:true,signals:["branch","growth","bifurcation","tree"],minConfidence:.6},
 {id:"rhythm",primitive:"pulse",weight:.8,repeatMin:3,repeatMax:9,mirror:true,signals:["rhythm","repeat","alternation","cadence"],minConfidence:.55},
 {id:"ascent",primitive:"chevron",weight:.7,repeatMin:1,repeatMax:4,mirror:true,signals:["ascent","upward","chevron","direction"],minConfidence:.6},
 {id:"band",primitive:"band",weight:.9,repeatMin:2,repeatMax:8,mirror:false,signals:["band","register","stripe","border","placement"],minConfidence:.6},
 {id:"lattice",primitive:"lattice",weight:.65,repeatMin:2,repeatMax:6,mirror:true,signals:["grid","lattice","interlock","crossing"],minConfidence:.65},
 {id:"meander",primitive:"meander",weight:.7,repeatMin:2,repeatMax:7,mirror:false,signals:["meander","continuous","path","turn"],minConfidence:.65},
 {id:"radial",primitive:"rosette",weight:.6,repeatMin:1,repeatMax:3,mirror:true,signals:["radial","rosette","center","rotation"],minConfidence:.7}
];
export const DEFAULT_GRAMMAR:Grammar={version:"0.2",rules:RULES};
const hash=(s:string)=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const words=(p:PrincipleSignal)=>`${p.kind} ${p.label} ${JSON.stringify(p.abstraction??{})}`.toLowerCase();
export function deriveGrammar(principles:PrincipleSignal[],fallback:Grammar=DEFAULT_GRAMMAR):Grammar{
 const eligible=principles.filter(p=>p.confidence>=.55&&!["restricted","sacred","prohibited"].includes(p.culturalAccess.toLowerCase()));
 if(!eligible.length)return fallback;
 const rules=fallback.rules.map(r=>{const matches=eligible.filter(p=>p.confidence>=r.minConfidence&&r.signals.some(s=>words(p).includes(s)));if(!matches.length)return null;const support=matches.reduce((n,p)=>n+p.confidence,0)/matches.length;return{...r,weight:Number(Math.min(1.5,r.weight*.45+support*.85).toFixed(4))}}).filter((r):r is GrammarRule=>r!==null);
 const first=fallback.rules[0];const active=rules.length?[...rules]:first?[first]:[];const axis=fallback.rules.find(r=>r.id==="axis");if(axis&&active.length&&!active.some(r=>r.id==="axis"))active.unshift(axis);return{version:"0.2",rules:active};
}
export function compose(intent:EngineIntent,grammar:Grammar=DEFAULT_GRAMMAR):CompositionPlan{
 const validation:string[]=[];if(!intent.seed.trim())validation.push("seed required");if(!intent.meanings.length)validation.push("semantic intent required");if(!intent.principleIds.length)validation.push("evidence-backed principles required");if(!intent.product.zones.length)validation.push("product zones required");
 if(validation.length)return{seed:intent.seed,productKind:intent.product.kind,rules:[],sequence:[],validation,evidencePrincipleIds:intent.principleIds};
 const ranked=[...grammar.rules].sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id)),count=Math.min(grammar.rules.length,intent.density==="restrained"?3:intent.density==="complex"?7:5),h=hash(intent.seed+"|"+intent.meanings.join("|")+"|"+intent.principleIds.join("|"));
 const pool=ranked.slice(0,Math.max(count,Math.min(ranked.length,8))),rules:GrammarRule[]=[];
 for(let i=0;i<pool.length&&rules.length<count;i++){const r=pool[(h+i*3)%pool.length];if(r&&!rules.some(x=>x.id===r.id))rules.push(r)}
 const axis=ranked.find(r=>r.id==="axis");if(axis&&!rules.some(r=>r.id==="axis"))rules.unshift(axis);
 const sequence=rules.flatMap(r=>Array(Math.max(r.repeatMin,Math.min(r.repeatMax,r.repeatMin+(hash(intent.seed+r.id)%(r.repeatMax-r.repeatMin+1))))).fill(r.id));
 return{seed:intent.seed,productKind:intent.product.kind,rules,sequence,validation:[],evidencePrincipleIds:intent.principleIds};
}


export type RelationKind="contains"|"frames"|"alternates"|"mirrors"|"branches_from"|"transitions_to"|"repeats_along"|"centers_on";
export interface GrammarRelation{from:string;to:string;kind:RelationKind;weight:number;evidencePrincipleIds:string[]}
export interface RelationalGrammar extends Grammar{relations:GrammarRelation[]}

const RELATION_SIGNALS:Array<{kind:RelationKind;from:string;to:string;signals:string[]}>= [
 {kind:"frames",from:"guard",to:"axis",signals:["frame","border","enclosure","edge"]},
 {kind:"repeats_along",from:"rhythm",to:"axis",signals:["repeat","rhythm","cadence","interval"]},
 {kind:"alternates",from:"band",to:"rhythm",signals:["alternation","alternate","register","band"]},
 {kind:"mirrors",from:"growth",to:"axis",signals:["mirror","bilateral","symmetry"]},
 {kind:"branches_from",from:"growth",to:"axis",signals:["branch","bifurcation","stem"]},
 {kind:"transitions_to",from:"journey",to:"ascent",signals:["transition","path","direction","sequence"]},
 {kind:"centers_on",from:"radial",to:"axis",signals:["center","radial","rotation","rosette"]},
 {kind:"contains",from:"guard",to:"radial",signals:["contain","enclosure","medallion","center"]}
];
export function deriveRelationalGrammar(principles:PrincipleSignal[],base:Grammar=deriveGrammar(principles)):RelationalGrammar{
 const safe=principles.filter(p=>p.confidence>=.55&&!["restricted","sacred","prohibited"].includes(p.culturalAccess.toLowerCase()));
 const active=new Set(base.rules.map(r=>r.id));
 const relations=RELATION_SIGNALS.map(spec=>{const matched=safe.filter(p=>spec.signals.some(s=>words(p).includes(s)));return{from:spec.from,to:spec.to,kind:spec.kind,weight:Number(Math.min(1,matched.reduce((n,p)=>n+p.confidence*.22,.35)).toFixed(4)),evidencePrincipleIds:matched.map(p=>p.id)}}).filter(r=>r.evidencePrincipleIds.length>0&&active.has(r.from)&&active.has(r.to));
 return{...base,relations};
}
export function validateRelationalGrammar(g:RelationalGrammar):string[]{const ids=new Set(g.rules.map(r=>r.id)),e:string[]=[];for(const r of g.relations){if(!ids.has(r.from))e.push(`relation source missing: ${r.from}`);if(!ids.has(r.to))e.push(`relation target missing: ${r.to}`);if(!r.evidencePrincipleIds.length)e.push(`relation lacks evidence: ${r.kind}`)}return e}


export interface EvidenceProfile{
 supportCount:number;sourceDiversity:number;regionDiversity:number;temporalDiversity:number;
 meanConfidence:number;contradictionCount:number;culturalRisk:"low"|"review"|"blocked";strength:number
}
export interface EvidenceObservation{principleId:string;sourceId:string;region?:string;period?:string;confidence:number;stance:"supports"|"contradicts";culturalAccess:string}
export function profileEvidence(principleId:string,obs:EvidenceObservation[]):EvidenceProfile{
 const xs=obs.filter(x=>x.principleId===principleId),supports=xs.filter(x=>x.stance==="supports"),contradictions=xs.length-supports.length;
 const uniq=(v:(x:EvidenceObservation)=>string|undefined)=>new Set(supports.map(v).filter(Boolean)).size;
 const mean=supports.length?supports.reduce((n,x)=>n+x.confidence,0)/supports.length:0;
 const blocked=xs.some(x=>["restricted","sacred","prohibited"].includes(x.culturalAccess.toLowerCase()));
 const review=!blocked&&xs.some(x=>["review","sensitive","nation-specific"].includes(x.culturalAccess.toLowerCase()));
 const diversity=Math.min(1,(uniq(x=>x.sourceId)/3)*.45+(uniq(x=>x.region)/3)*.3+(uniq(x=>x.period)/3)*.25);
 const contradictionPenalty=xs.length?contradictions/xs.length:0;
 const strength=Math.max(0,Math.min(1,mean*.55+diversity*.35+Math.min(1,supports.length/8)*.1-contradictionPenalty*.5));
 return{supportCount:supports.length,sourceDiversity:uniq(x=>x.sourceId),regionDiversity:uniq(x=>x.region),temporalDiversity:uniq(x=>x.period),meanConfidence:Number(mean.toFixed(4)),contradictionCount:contradictions,culturalRisk:blocked?"blocked":review?"review":"low",strength:Number(strength.toFixed(4))}
}
export interface PrincipleHypothesis{principle:PrincipleSignal;evidence:EvidenceProfile;eligible:boolean;reasons:string[]}
export function evaluatePrinciple(p:PrincipleSignal,obs:EvidenceObservation[]):PrincipleHypothesis{
 const evidence=profileEvidence(p.id,obs),reasons:string[]=[];
 if(evidence.supportCount<2)reasons.push("insufficient independent support");
 if(evidence.sourceDiversity<2)reasons.push("insufficient source diversity");
 if(evidence.strength<.55)reasons.push("weak evidence strength");
 if(evidence.contradictionCount>evidence.supportCount)reasons.push("contradiction dominates support");
 if(evidence.culturalRisk==="blocked")reasons.push("culturally blocked");
 if(evidence.culturalRisk==="review")reasons.push("cultural review required");
 return{principle:p,evidence,eligible:reasons.length===0,reasons}
}
export function deriveAuditedGrammar(principles:PrincipleSignal[],obs:EvidenceObservation[]):RelationalGrammar{
 const eligible=principles.filter(p=>evaluatePrinciple(p,obs).eligible);
 return deriveRelationalGrammar(eligible,deriveGrammar(eligible));
}
