import { EngineIntent, validateEngineIntent } from "./core";

export type PrimitiveKind="axis"|"branch"|"enclosure"|"step"|"pulse"|"arc"|"chevron";
export interface GrammarRule {id:string;primitive:PrimitiveKind;weight:number;repeatMin:number;repeatMax:number;mirror:boolean}
export interface Grammar {version:"0.1";rules:GrammarRule[]}
export interface CompositionPlan {seed:string;productKind:string;rules:GrammarRule[];sequence:string[];validation:string[]}

function hash(s:string){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function choose<T>(xs:T[],n:number){return xs[n%xs.length]}
export const DEFAULT_GRAMMAR:Grammar={version:"0.1",rules:[
 {id:"axis",primitive:"axis",weight:1,repeatMin:1,repeatMax:1,mirror:false},
 {id:"guard",primitive:"enclosure",weight:.8,repeatMin:1,repeatMax:2,mirror:true},
 {id:"journey",primitive:"step",weight:.7,repeatMin:2,repeatMax:5,mirror:false},
 {id:"growth",primitive:"branch",weight:.8,repeatMin:2,repeatMax:6,mirror:true},
 {id:"rhythm",primitive:"pulse",weight:.6,repeatMin:3,repeatMax:8,mirror:true},
 {id:"ascent",primitive:"chevron",weight:.7,repeatMin:1,repeatMax:4,mirror:true}
]};
export function compose(intent:EngineIntent,grammar:Grammar=DEFAULT_GRAMMAR):CompositionPlan{
 const validation=validateEngineIntent(intent); if(validation.length)return{seed:intent.seed,productKind:intent.product.kind,rules:[],sequence:[],validation};
 const h=hash(intent.seed+"|"+intent.meanings.join("|")+"|"+intent.principleIds.join("|"));
 const count=intent.density==="restrained"?3:intent.density==="complex"?6:4;
 const rules:Array<GrammarRule>=[];for(let i=0;i<count;i++){const r=choose(grammar.rules,h+i*2654435761);if(!rules.some(x=>x.id===r.id))rules.push(r)}
 if(!rules.some(x=>x.id==="axis"))rules.unshift(grammar.rules[0]);
 return{seed:intent.seed,productKind:intent.product.kind,rules,sequence:rules.flatMap(r=>Array(Math.max(r.repeatMin,Math.min(r.repeatMax,1+(hash(intent.seed+r.id)%r.repeatMax)))).fill(r.id)),validation:[]};
}
