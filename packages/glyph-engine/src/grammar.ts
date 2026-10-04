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
export function deriveGrammar(principles:PrincipleSignal[],fallback=DEFAULT_GRAMMAR):Grammar{
 const eligible=principles.filter(p=>p.confidence>=.55&&!["restricted","sacred","prohibited"].includes(p.culturalAccess.toLowerCase()));
 if(!eligible.length)return fallback;
 const rules=fallback.rules.map(r=>{const matches=eligible.filter(p=>p.confidence>=r.minConfidence&&r.signals.some(s=>words(p).includes(s)));const boost=matches.reduce((n,p)=>n+p.confidence*.18,0);return{...r,weight:Number((r.weight+boost).toFixed(4))}}).filter(r=>r.weight>=.6);
 return{version:"0.2",rules};
}
export function compose(intent:EngineIntent,grammar:Grammar=DEFAULT_GRAMMAR):CompositionPlan{
 const validation:string[]=[];if(!intent.seed.trim())validation.push("seed required");if(!intent.meanings.length)validation.push("semantic intent required");if(!intent.principleIds.length)validation.push("evidence-backed principles required");if(!intent.product.zones.length)validation.push("product zones required");
 if(validation.length)return{seed:intent.seed,productKind:intent.product.kind,rules:[],sequence:[],validation,evidencePrincipleIds:intent.principleIds};
 const ranked=[...grammar.rules].sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id)),count=intent.density==="restrained"?3:intent.density==="complex"?7:5,h=hash(intent.seed+"|"+intent.meanings.join("|")+"|"+intent.principleIds.join("|"));
 const pool=ranked.slice(0,Math.max(count,Math.min(ranked.length,8))),rules:GrammarRule[]=[];
 for(let i=0;i<pool.length&&rules.length<count;i++){const r=pool[(h+i*3)%pool.length];if(!rules.some(x=>x.id===r.id))rules.push(r)}
 if(!rules.some(r=>r.id==="axis"))rules.unshift(ranked.find(r=>r.id==="axis")??DEFAULT_GRAMMAR.rules[0]);
 const sequence=rules.flatMap(r=>Array(Math.max(r.repeatMin,Math.min(r.repeatMax,r.repeatMin+(hash(intent.seed+r.id)%(r.repeatMax-r.repeatMin+1))))).fill(r.id));
 return{seed:intent.seed,productKind:intent.product.kind,rules,sequence,validation:[],evidencePrincipleIds:intent.principleIds};
}
