import type{Topology}from"./topology";
import type{LegoBlock,LegoSocket}from"./pattern-lego-grammar";
import{primitiveForForm}from"./ascend-primitives";
export interface CompositionScore{hierarchy:number;rhythm:number;balance:number;surprise:number;coherence:number;negativeSpace:number;scaleSurvival:number;originality:number;total:number}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function scoreComposition(blocks:LegoBlock[]):CompositionScore{if(!blocks.length)return{hierarchy:0,rhythm:0,balance:0,surprise:0,coherence:0,negativeSpace:0,scaleSurvival:0,originality:0,total:0};const families=new Set(blocks.map(b=>b.family)).size/blocks.length;const roles=new Set(blocks.flatMap(b=>b.semanticRoles)).size/Math.max(1,blocks.length);const sockets=blocks.reduce((n,b)=>n+b.sockets.length,0)/blocks.length;const nested=blocks.filter(b=>b.children?.length).length/blocks.length;const mutation=blocks.reduce((n,b)=>n+b.mutation,0)/blocks.length;const s={hierarchy:clamp(.45+nested*.55),rhythm:clamp(.5+sockets*.08),balance:clamp(.75-Math.abs(.2-mutation)),surprise:clamp(.35+mutation+families*.25),coherence:clamp(.85-families*.2+roles*.1),negativeSpace:clamp(.4+blocks.filter(b=>b.sockets.some(s=>s.kind==="void")).length/blocks.length*.5),scaleSurvival:clamp(.5+nested*.4),originality:clamp(.45+families*.25+mutation)};return{...s,total:Object.values(s).reduce((a,b)=>a+b,0)/8}}
export function rankCompositions<T extends{blocks:LegoBlock[]}>(c:T[]){return c.map(x=>({candidate:x,score:scoreComposition(x.blocks)})).sort((a,b)=>b.score.total-a.score.total)}

const socketKind=(relation:string):import("./pattern-lego-grammar").SocketKind=>relation==="branch"?"branch":relation==="radiate"?"radial":relation==="return"||relation==="orbit"?"loop":relation==="terminate"?"void":relation==="flow"||relation==="ascend"?"stem":"edge";
export function blocksFromTopology(t:Topology):LegoBlock[]{return t.nodes.map(n=>{const attached=t.edges.filter(e=>e.from===n.id||e.to===n.id);const transformLoad=attached.filter(e=>["transform","intersect","oppose","terminate"].includes(e.relation)).length/Math.max(1,attached.length);const sockets:LegoSocket[]=attached.map((e,i)=>({id:`${n.id}:s${i}`,kind:socketKind(e.relation),polarity:e.from===n.id?"out":"in",x:e.from===n.id?1:0,y:(i+1)/(attached.length+1),angle:e.from===n.id?0:180,tolerance:35,scaleMin:.25,scaleMax:4,tags:[e.relation]}));if(n.form==="void")sockets.push({id:`${n.id}:void`,kind:"void",polarity:"either",x:.5,y:.5,angle:0,tolerance:180,scaleMin:.25,scaleMax:4,tags:["negative-space"]});return{id:n.id,family:n.form,sourceInstanceIds:[],semanticRoles:[n.conceptId],symmetry:"none",mutation:clamp(.08+transformLoad*.55),sockets,children:n.scale>=3?[{blockId:n.id,x:0,y:0,rotation:0,scale:.5}]:undefined}})}
export function scoreTopologyComposition(t:Topology){return scoreComposition(blocksFromTopology(t))}

export interface QualityGateResult{accepted:boolean;sourcePrimitiveRatio:number;genericRisk:number;reasons:string[]}
export function qualityGate(t:Topology,s:CompositionScore,mode:string):QualityGateResult{
 const reasons:string[]=[];
 const sourcePrimitiveRatio=t.nodes.length?t.nodes.filter(n=>!!primitiveForForm(n.form)).length/t.nodes.length:0;
 const minTotal=mode==="field"?.58:.55,minHierarchy=mode==="field"?.58:.48,minRhythm=["band","cuff","collar"].includes(mode)?.55:.45;
 const forms=t.nodes.map(n=>n.form),relations=t.edges.map(e=>e.relation),n=Math.max(1,forms.length),e=Math.max(1,relations.length);
 const formCounts=new Map<string,number>();for(const f of forms)formCounts.set(f,(formCounts.get(f)??0)+1);
 const dominantForm=Math.max(0,...formCounts.values())/n;
 const repeatLoad=relations.filter(r=>r==="repeat").length/e;
 const interruptionLoad=relations.filter(r=>["terminate","oppose","intersect","transform","branch"].includes(r)).length/e;
 const closureLoad=relations.filter(r=>["return","enclose","orbit"].includes(r)).length/e;
 const bilateralRisk=(relations.filter(r=>r==="oppose").length/e)*.45+(dominantForm>.62?.25:0);
 const ornamentClicheRisk=forms.filter(f=>["opposition","crossing"].includes(f)).length/n*.45;
 const overRepeatRisk=Math.max(0,repeatLoad-.45)*1.6;
 const underInterruptionRisk=Math.max(0,.18-interruptionLoad)*1.8;
 const closedWallpaperRisk=Math.max(0,closureLoad-.65)*.8;
 const genericRisk=clamp(bilateralRisk+ornamentClicheRisk+overRepeatRisk+underInterruptionRisk+closedWallpaperRisk+(1-s.surprise)*.12);
 if(s.total<minTotal)reasons.push("weak-overall-composition");
 if(s.hierarchy<minHierarchy)reasons.push("weak-hierarchy");
 if(s.rhythm<minRhythm)reasons.push("weak-rhythm");
 if(s.coherence<.55)reasons.push("weak-coherence");
 if(s.negativeSpace<.4)reasons.push("insufficient-negative-space");
 if(s.scaleSurvival<.5)reasons.push("poor-scale-survival");
 if(sourcePrimitiveRatio<.6)reasons.push("insufficient-ascend-source-geometry");
 if(dominantForm>.72)reasons.push("single-form-dominance");
 if(["field","emblem","sleeve"].includes(mode)&&interruptionLoad<.12)reasons.push("insufficient-interruption");
 if(genericRisk>.58)reasons.push("generic-ornament-risk");
 return{accepted:reasons.length===0,sourcePrimitiveRatio,genericRisk,reasons};
}
