import type {IntentVector,WeightedRef} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";
import {compileIntent} from "./intent";import {retrievePrinciples} from "./knowledge";import {buildTopology,type Topology} from "./topology";
import {mutateTopology} from "./mutate";import {evaluateTopology} from "./evaluate";import {checkConstraints} from "./constraints";import {noveltyAgainst} from "./novelty";

export type SearchInput={seed:string;intent:IntentVector;principles:PrincipleRecord[];antiStyle?:WeightedRef[];population?:number;keep?:number;generations?:number};
export type SearchCandidate={topology:Topology;score:number;novelty:number;trace:string[]};

export function searchDesignSpace(input:SearchInput):SearchCandidate[]{
 const plan=compileIntent(input.intent),principles=retrievePrinciples(plan.intent,input.principles);
 const root=buildTopology(plan.semanticSkeleton,principles),history:Topology[]=[root];
 let population:Topology[]=[root];const pop=Math.max(8,Math.min(input.population??48,256)),gens=Math.max(1,Math.min(input.generations??3,12));
 for(let g=0;g<gens;g++){
  const expanded:Topology[]=[];
  for(let i=0;i<pop;i++)expanded.push(mutateTopology(population[i%population.length]!,input.seed+":"+g,i));
  const scored=expanded.map(t=>{
   const c=checkConstraints(t,principles);if(c.hard.length)return {t,score:-Infinity};
   const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle);
   const novelty=noveltyAgainst(t,history);const soft=c.soft.reduce((s,x)=>s+x.penalty,0);
   return {t,score:e.score+novelty*18-soft*100};
  }).sort((a,b)=>b.score-a.score);
  population=scored.slice(0,Math.max(4,Math.floor(pop/4))).map(x=>x.t);history.push(...population);
 }
 return population.map(t=>{
  const e=evaluateTopology(t,plan.semanticSkeleton.length,principles.length,input.antiStyle),novelty=noveltyAgainst(t,[root]);
  return {topology:t,score:e.score+novelty*18,novelty,trace:[`novelty:${novelty.toFixed(3)}`,`relations:${new Set(t.edges.map(x=>x.relation)).size}`]};
 }).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(input.keep??8,32)));
}
