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
import {paretoSelect,type ObjectiveVector} from "./pareto";
import {objectiveVector} from "./objectives";
import {topologyVisualVector} from "./candidate-visual-vector";
import {assessVisual} from "./visual-assessment";
import {assessManufacturability} from "./manufacturability";
import {nameLineage} from "./lineage";
import type {LearnedRelationPrior} from "./learned-relation-prior";
import {learnedRelationScore} from "./learned-relation-prior";
import type {StructuralFeedback} from "./structural-feedback";

export type SearchInput={seed:string;intent:IntentVector;principles:PrincipleRecord[];antiStyle?:WeightedRef[];visualCorpus?:ImageObservation[];selectionPolicy?:SelectionPolicy;niches?:DesignNicheId[];medium?:MediumId;physicalHistory?:PhysicalValidation[];substrateId?:string;machineProfileId?:string;population?:number;keep?:number;generations?:number;relationPrior?:LearnedRelationPrior;structuralFeedback?:StructuralFeedback};
export type SearchCandidate={topology:Topology;score:number;novelty:number;lineageId:string;objectives:ObjectiveVector;trace:string[]};
type Scored={t:Topology;score:number;objectives?:ObjectiveVector};

export function searchDesignSpace(input:SearchInput):SearchCandidate[]{
 const plan=compileIntent(input.intent),principles=retrievePrinciples(plan.intent,input.principles);
 const searchCorpus=input.visualCorpus?.length?(input.visualCorpus.length>256?input.visualCorpus.filter((_,i)=>i%Math.ceil(input.visualCorpus!.length/256)===0).slice(0,256):input.visualCorpus):undefined;
 const root=buildTopology(plan.semanticSkeleton,principles),history:Topology[]=[root];
 const ancestry=new WeakMap<Topology,string[]>();
 const lineageIds=new WeakMap<Topology,string>();
 lineageIds.set(root,nameLineage(root,0,input.niches).id);
 let population:Topology[]=[root];const pop=Math.max(8,Math.min(input.population??48,256)),gens=Math.max(1,Math.min(input.generations??3,12));
 for(let g=0;g<gens;g++){
  const expanded:Topology[]=[];
  for(let i=0;i<pop;i++){
   const parent=population[i%population.length]!,child=mutateTopology(parent,input.seed+":"+g,i,input.relationPrior,input.structuralFeedback);
   const parentId=lineageIds.get(parent)??nameLineage(parent,g,input.niches).id;
   ancestry.set(child,[parentId]);expanded.push(child);
  }
  if(population.length>1)for(let i=0;i<Math.min(pop, population.length*2);i++){const a=population[i%population.length]!,b=population[(i+1+g)%population.length]!,x=crossSpecies(a,b,input.seed+":"+g,i);if(x)expanded.push(x)}
  const scored:Scored[]=expanded.map(t=>{
   const c=checkConstraints(t,principles);if(c.hard.length)return {t,score:-Infinity};
   const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle);
   const novelty=noveltyAgainst(t,history);const soft=c.soft.reduce((s,x)=>s+x.penalty,0);
   const survival=searchCorpus?.length?corpusSurvival(t,searchCorpus,input.selectionPolicy):undefined;
   if(survival&&!survival.survive)return {t,score:-Infinity};
   const niche=input.niches?.length?Math.max(...input.niches.map(id=>nicheFitness(t,DESIGN_NICHES[id]))):assignNiche(t).fitness;
   const pf=input.medium&&input.physicalHistory?.length?productionFitness(t,input.medium,input.physicalHistory,input.substrateId,input.machineProfileId):undefined;
   const visual=searchCorpus?.length?assessVisual(topologyVisualVector(t),searchCorpus):undefined;
   const manufacturing=input.medium?assessManufacturability(t,input.medium):undefined;
   const objectives=objectiveVector(t,{semanticScore:e.score,novelty,culturalConfidence:Math.max(0,1-soft),visual,manufacturing,physical:pf});
   return {t,score:e.score+novelty*18-soft*100+(survival?.fitnessDelta??0)+niche*16+(pf?pf.score*18:0)+learnedRelationScore(t,input.relationPrior),objectives};
  }).sort((a,b)=>b.score-a.score);
  const viable=scored.filter((x):x is Scored&{objectives:ObjectiveVector}=>Number.isFinite(x.score)&&!!x.objectives);
  const pareto=paretoSelect(viable.map(x=>({item:x,objectives:x.objectives})),Math.max(8,Math.floor(pop*.75))).map(x=>x.item);
  const speciesPool=diverseSelection(pareto,Math.max(8,Math.floor(pop/2))).map(t=>pareto.find(x=>x.t===t)!).filter(Boolean);
  population=nicheDiversity(speciesPool,Math.max(4,Math.floor(pop/4))).map(x=>x.t);history.push(...population);
 }
 const finalists=population.map(t=>{
  const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle),novelty=noveltyAgainst(t,[root]);
  const survival=input.visualCorpus?.length?corpusSurvival(t,input.visualCorpus,input.selectionPolicy):undefined;
  const lineage=nameLineage(t,gens,input.niches,ancestry.get(t)??[]);
  const visual=input.visualCorpus?.length?assessVisual(topologyVisualVector(t),input.visualCorpus):undefined;
  const manufacturing=input.medium?assessManufacturability(t,input.medium):undefined;
  const physical=input.medium&&input.physicalHistory?.length?productionFitness(t,input.medium,input.physicalHistory,input.substrateId,input.machineProfileId):undefined;
  const objectives=objectiveVector(t,{semanticScore:e.score,novelty,culturalConfidence:1,visual,manufacturing,physical});
  return {topology:t,score:e.score+novelty*18+(survival?.fitnessDelta??0)+learnedRelationScore(t,input.relationPrior),novelty,lineageId:lineage.id,objectives,trace:[`lineage:${lineage.id}`,`parents:${lineage.parentIds.join(",")||"root"}`,`novelty:${novelty.toFixed(3)}`,`relations:${new Set(t.edges.map(x=>x.relation)).size}`,`corpus-fitness:${(survival?.fitnessDelta??0).toFixed(2)}`,`species:${classifySpecies(t)}`,`learned-relation:${learnedRelationScore(t,input.relationPrior).toFixed(2)}`,`niche:${assignNiche(t,input.niches).primary}`,...(input.medium&&input.physicalHistory?.length?(()=>{const p=productionFitness(t,input.medium!,input.physicalHistory!,input.substrateId,input.machineProfileId);return [`physical-risk:${p.risk.toFixed(2)}`,`physical-confidence:${p.confidence.toFixed(2)}`,...p.reasons]})():[]),...(survival?.reasons??[])]};
 });
 const keep=Math.max(1,Math.min(input.keep??8,32));
 return paretoSelect(finalists.map(x=>({item:x,objectives:x.objectives})),keep).map(x=>x.item);
}
