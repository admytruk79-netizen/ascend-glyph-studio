import { EngineIntent } from "./core";import { generateCandidates } from "./candidates";import { Grammar } from "./grammar";
export interface AblationResult{principleId:string;baselineScore:number;ablatedScore:number;scoreDelta:number;geometryChanged:boolean;meaningful:boolean}
const sig=(x:ReturnType<typeof generateCandidates>[number])=>x.zones.map(z=>z.svg).join("|");
export function ablatePrinciples(intent:EngineIntent,grammar?:Grammar):AblationResult[]{
 const base=generateCandidates(intent,1,grammar)[0];if(!base)return[];
 return intent.principleIds.map(principleId=>{const ids=intent.principleIds.filter(x=>x!==principleId);if(!ids.length)return{principleId,baselineScore:base.score,ablatedScore:base.score,scoreDelta:0,geometryChanged:false,meaningful:false};
 const alt=generateCandidates({...intent,principleIds:ids},1,grammar)[0]!;const delta=Number((base.score-alt.score).toFixed(4)),changed=sig(base)!==sig(alt);return{principleId,baselineScore:base.score,ablatedScore:alt.score,scoreDelta:delta,geometryChanged:changed,meaningful:changed||Math.abs(delta)>=.03}})}
