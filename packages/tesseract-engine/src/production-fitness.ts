import type {Topology} from "./topology";
import type {MediumId} from "./medium-compiler";
import type {PhysicalValidation} from "./physical-feedback";
import {topologyFeedbackSignature,feedbackRisk} from "./feedback-memory";

export type ProductionFitness={score:number;risk:number;confidence:number;reasons:string[]};
export function productionFitness(t:Topology,medium:MediumId,history:PhysicalValidation[],substrateId?:string,machineProfileId?:string):ProductionFitness{
 const sig=topologyFeedbackSignature(t,medium,substrateId,machineProfileId),r=feedbackRisk(sig,history);
 const reasons:string[]=[];if(r.risk>.65&&r.confidence>.5)reasons.push("high-physical-failure-risk");else if(r.risk>.35)reasons.push("physical-risk");
 if(r.confidence<.2)reasons.push("limited-physical-evidence");
 return {score:Math.max(0,1-r.risk*r.confidence),risk:r.risk,confidence:r.confidence,reasons};
}
