import type {PrimitiveGeometry,PrimitiveId} from "./ascend-primitives";
import {ASCEND_PRIMITIVES} from "./ascend-primitives";

export type PrimitiveOperation="open"|"close"|"contain"|"bifurcate"|"orbit"|"intersect"|"emit"|"oppose"|"return"|"vanish";
export type TransformRule={
 id:string;from:PrimitiveId;operation:PrimitiveOperation;to:PrimitiveId;
 preserves:("identity"|"center"|"axis"|"closure"|"chirality"|"branch-order")[];
 requiresPort?:string;semanticEffect:string;cost:number;
};
export type PrimitiveState={primitive:PrimitiveGeometry;history:string[];semanticEffects:string[]};

export const TRANSFORM_RULES:TransformRule[]=[
 {id:"torus-open",from:"torus",operation:"open",to:"orbit",preserves:["identity","center","chirality"],requiresPort:"orbit-a",semanticEffect:"continuity becomes passage",cost:.35},
 {id:"torus-contain-seed",from:"torus",operation:"contain",to:"torus",preserves:["identity","center","closure"],requiresPort:"center",semanticEffect:"continuity protects potential",cost:.2},
 {id:"torus-axis",from:"torus",operation:"intersect",to:"axis",preserves:["center"],requiresPort:"center",semanticEffect:"cycle acquires orientation",cost:.45},
 {id:"axis-branch",from:"axis",operation:"bifurcate",to:"branch",preserves:["axis","branch-order"],requiresPort:"top",semanticEffect:"orientation becomes choice or lineage",cost:.3},
 {id:"axis-cross",from:"axis",operation:"intersect",to:"crossing",preserves:["center","axis"],semanticEffect:"orientation encounters threshold",cost:.4},
 {id:"branch-emit",from:"branch",operation:"emit",to:"radial-emission",preserves:["center","branch-order"],semanticEffect:"lineage becomes manifestation",cost:.5},
 {id:"orbit-return",from:"orbit",operation:"return",to:"torus",preserves:["center","chirality"],requiresPort:"exit",semanticEffect:"passage closes into return",cost:.3},
 {id:"opposition-cross",from:"opposition",operation:"intersect",to:"crossing",preserves:["center"],semanticEffect:"tension becomes encounter",cost:.35},
 {id:"cross-vanish",from:"crossing",operation:"vanish",to:"void",preserves:["center"],semanticEffect:"encounter resolves into absence",cost:.55},
 {id:"void-seed",from:"void",operation:"contain",to:"seed",preserves:["center"],requiresPort:"center",semanticEffect:"absence contains renewed potential",cost:.45},
 {id:"seed-branch",from:"seed",operation:"bifurcate",to:"branch",preserves:["identity","center"],requiresPort:"growth",semanticEffect:"potential becomes lineage",cost:.3},
 {id:"seed-orbit",from:"seed",operation:"orbit",to:"orbit",preserves:["center"],semanticEffect:"potential enters relationship",cost:.4},
 {id:"emission-return",from:"radial-emission",operation:"return",to:"torus",preserves:["center"],semanticEffect:"manifestation returns to continuity",cost:.6},
 {id:"flow-orbit",from:"spatial-flow",operation:"orbit",to:"orbit",preserves:["center","chirality"],semanticEffect:"movement becomes recurrence",cost:.25}
];

export function availableTransforms(from:PrimitiveId){return TRANSFORM_RULES.filter(r=>r.from===from);}
export function transformPrimitive(state:PrimitiveState,ruleId:string):PrimitiveState{
 const r=TRANSFORM_RULES.find(x=>x.id===ruleId&&x.from===state.primitive.id);if(!r)throw new Error(`Invalid primitive transformation: ${ruleId}`);
 if(r.requiresPort&&!state.primitive.ports.some(p=>p.id===r.requiresPort))throw new Error(`Missing required port: ${r.requiresPort}`);
 return {primitive:ASCEND_PRIMITIVES[r.to],history:[...state.history,r.id],semanticEffects:[...state.semanticEffects,r.semanticEffect]};
}
export function transformationPath(from:PrimitiveId,to:PrimitiveId,maxDepth=5):TransformRule[]|null{
 if(from===to)return [];let q:{id:PrimitiveId,path:TransformRule[]}[]=[{id:from,path:[]}],seen=new Set<PrimitiveId>([from]);
 while(q.length){const x=q.shift()!;if(x.path.length>=maxDepth)continue;for(const r of availableTransforms(x.id)){const p=[...x.path,r];if(r.to===to)return p;if(!seen.has(r.to)){seen.add(r.to);q.push({id:r.to,path:p})}}}return null;
}
