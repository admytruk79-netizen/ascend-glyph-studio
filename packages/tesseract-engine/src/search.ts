import type {IntentVector,WeightedRef} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";
import {compileIntent} from "./intent";import {retrievePrinciples} from "./knowledge";import {buildTopology,type Topology} from "./topology";
import {mutateTopology} from "./mutate";import {evaluateTopology} from "./evaluate";import {checkConstraints} from "./constraints";import {noveltyAgainst} from "./novelty";
import type {ImageObservation} from "./image-corpus";
import {corpusSurvival,type SelectionPolicy} from "./evolutionary-selection";
import {diverseSelection,classifySpecies} from "./speciation";
import {crossSpecies} from "./crossover";
import {assignNiche,nicheDiversity} from "./niche-selection";
import {DESIGN_NICHES,nicheFitness,type DesignNicheId} from "./niches";
import type {MediumId} from "./medium-compiler";
import type {PhysicalValidation} from "./physical-feedback";
import {productionFitness} from "./production-fitness";
import {paretoSelect,type ParetoCandidate} from "./pareto";
import {objectiveVector} from "./objectives";
import {topologyVisualVector} from "./candidate-visual-vector";
import {assessVisual} from "./visual-assessment";
import {assessManufacturability} from "./manufacturability";
import {nameLineage} from "./lineage";

export type SearchInput={seed:string;intent:IntentVector;principles:PrincipleRecord[];antiStyle?:WeightedRef[];visualCorpus?:ImageObservation[];selectionPolicy?:SelectionPolicy;niches?:DesignNicheId[];medium?:MediumId;physicalHistory?:PhysicalValidation[];substrateId?:string;machineProfileId?:string;population?:number;keep?:number;generations?:number};
export type SearchCandidate={topology:Topology;score:number;novelty:number;lineageId:string;trace:string[]};

export function searchDesignSpace(input:SearchInput):SearchCandidate[]{
 const plan=compileIntent(input.intent),principles=retrievePrinciples(plan.intent,input.principles);
 const root=buildTopology(plan.semanticSkeleton,principles),history:Topology[]=[root];
 let population:Topology[]=[root];const pop=Math.max(8,Math.min(input.population??48,256)),gens=Math.max(1,Math.min(input.generations??3,12));
 for(let g=0;g<gens;g++){
  const expanded:Topology[]=[];
  for(let i=0;i<pop;i++)expanded.push(mutateTopology(population[i%population.length]!,input.seed+":"+g,i));
  if(population.length>1)for(let i=0;i<Math.min(pop, population.length*2);i++){const a=population[i%population.length]!,b=population[(i+1+g)%population.length]!,x=crossSpecies(a,b,input.seed+":"+g,i);if(x)expanded.push(x)}
  const scored=expanded.map(t=>{
   const c=checkConstraints(t,principles);if(c.hard.length)return {t,score:-Infinity};
   const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle);
   const novelty=noveltyAgainst(t,history);const soft=c.soft.reduce((s,x)=>s+x.penalty,0);
   const survival=input.visualCorpus?.length?corpusSurvival(t,input.visualCorpus,input.selectionPolicy):undefined;
   if(survival&&!survival.survive)return {t,score:-Infinity};
   const niche=input.niches?.length?Math.max(...input.niches.map(id=>nicheFitness(t,DESIGN_NICHES[id]))):assignNiche(t).fitness;
   const pf=input.medium&&input.physicalHistory?.length?productionFitness(t,input.medium,input.physicalHistory,input.substrateId,input.machineProfileId):undefined;
   const visual=input.visualCorpus?.length?assessVisual(topologyVisualVector(t),input.visualCorpus):undefined;
   const manufacturing=input.medium?assessManufacturability(t,input.medium):undefined;
   const objectives=objectiveVector(t,{semanticScore:e.score,novelty,culturalConfidence:Math.max(0,1-soft),visual,manufacturing,physical:pf});
   return {t,score:e.score+novelty*18-soft*100+(survival?.fitnessDelta??0)+niche*16+(pf?pf.score*18:0),objectives};
  }).sort((a,b)=>b.score-a.score);
  const viable=scored.filter(x=>Number.isFinite(x.score)&&x.objectives) as Array<{t:Topology;score:number;objectives:ReturnType<typeof objectiveVector>}>;
  const pareto=paretoSelect(viable.map(x=>({item:x,objectives:x.objectives})),Math.max(8,Math.floor(pop*.75))).map(x=>x.item);
  const speciesPool=diverseSelection(pareto,Math.max(8,Math.floor(pop/2))).map(t=>pareto.find(x=>x.t===t)!).filter(Boolean);
  population=nicheDiversity(speciesPool,Math.max(4,Math.floor(pop/4))).map(x=>x.t);history.push(...population);
 }
 return population.map(t=>{
  const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle),novelty=noveltyAgainst(t,[root]);
  const survival=input.visualCorpus?.length?corpusSurvival(t,input.visualCorpus,input.selectionPolicy):undefined;
  const lineage=nameLineage(t,gens,input.niches);
  return {topology:t,score:e.score+novelty*18+(survival?.fitnessDelta??0),novelty,lineageId:lineage.id,trace:[`lineage:${lineage.id}`,`novelty:${novelty.toFixed(3)}`,`relations:${new Set(t.edges.map(x=>x.relation)).size}`,`corpus-fitness:${(survival?.fitnessDelta??0).toFixed(2)}`,`species:${classifySpecies(t)}`,`niche:${assignNiche(t,input.niches).primary}`,...(input.medium&&input.physicalHistory?.length?(()=>{const p=productionFitness(t,input.medium!,input.physicalHistory!,input.substrateId,input.machineProfileId);return [`physical-risk:${p.risk.toFixed(2)}`,`physical-confidence:${p.confidence.toFixed(2)}`,...p.reasons]})():[]),...(survival?.reasons??[])]};
 }).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(input.keep??8,32)));
}
