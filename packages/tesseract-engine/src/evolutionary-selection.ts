import type {ImageObservation} from "./image-corpus";
import type {Topology} from "./topology";
import {topologyVisualVector} from "./candidate-visual-vector";
import {assessVisual,type VisualAssessment} from "./visual-assessment";

export type SurvivalDecision={fitnessDelta:number;survive:boolean;assessment:VisualAssessment;reasons:string[]};
export type SelectionPolicy={
 derivativeKill:number;genericKill:number;minimumNovelty:number;minimumEvidence:number;
 derivativePenalty:number;genericPenalty:number;noveltyReward:number;evidenceReward:number;
};
export const DEFAULT_SELECTION_POLICY:SelectionPolicy={
 derivativeKill:.93,genericKill:.9,minimumNovelty:.08,minimumEvidence:0,
 derivativePenalty:42,genericPenalty:32,noveltyReward:30,evidenceReward:10
};
export function corpusSurvival(t:Topology,corpus:ImageObservation[],p:SelectionPolicy=DEFAULT_SELECTION_POLICY):SurvivalDecision{
 const a=assessVisual(topologyVisualVector(t),corpus),reasons:string[]=[];
 let survive=true;
 if(a.derivativeRisk>=p.derivativeKill){survive=false;reasons.push("derivative-kill");}
 if(a.genericRisk>=p.genericKill){survive=false;reasons.push("generic-kill");}
 if(a.novelty<p.minimumNovelty){survive=false;reasons.push("novelty-floor");}
 if(a.evidenceSupport<p.minimumEvidence){survive=false;reasons.push("evidence-floor");}
 const fitnessDelta=a.novelty*p.noveltyReward+a.evidenceSupport*p.evidenceReward-a.derivativeRisk*p.derivativePenalty-a.genericRisk*p.genericPenalty;
 if(a.flags.length)reasons.push(...a.flags);
 return {fitnessDelta,survive,assessment:a,reasons};
}
