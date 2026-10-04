import type {Topology} from "./topology";
import type {ObjectiveVector} from "./pareto";
import type {VisualAssessment} from "./visual-assessment";
import type {ManufacturabilityReport} from "./manufacturability";
import type {ProductionFitness} from "./production-fitness";
export type ObjectiveEvidence={semanticScore:number;novelty:number;culturalConfidence:number;visual?:VisualAssessment;manufacturing?:ManufacturabilityReport;physical?:ProductionFitness};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function objectiveVector(_t:Topology,e:ObjectiveEvidence):ObjectiveVector{
 const v=e.visual;
 return {
  meaning:clamp(e.semanticScore/140),
  novelty:clamp(e.novelty),
  culturalIntegrity:clamp(e.culturalConfidence),
  manufacturability:clamp(e.manufacturing?.score??.5),
  visualIdentity:clamp(v?(.55*v.novelty+.45*(1-v.genericRisk)):.5),
  physicalConfidence:clamp(e.physical?e.physical.score*e.physical.confidence:.25),
  genericResistance:clamp(v?1-v.genericRisk:.5)
 };
}
