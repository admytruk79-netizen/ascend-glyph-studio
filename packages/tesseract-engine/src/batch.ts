import type {IntentVector,WeightedRef} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";
import {searchDesignSpace,type SearchCandidate} from "./search";
import {genomeFromTopology} from "./genome";
import {projectGenomeSvg,type SvgProjection} from "./svg-projector";

export type BatchInput={
 seed:string;
 intent:IntentVector;
 principles:PrincipleRecord[];
 antiStyle?:WeightedRef[];
 population?:number;
 generations?:number;
 keep?:number;
};

export type BatchCandidate={
 rank:number;
 score:number;
 novelty:number;
 trace:string[];
 genomeId:string;
 projection:SvgProjection;
};

export type BatchResult={
 seed:string;
 candidateCount:number;
 candidates:BatchCandidate[];
};

export function runTesseractBatch(input:BatchInput):BatchResult{
 const found:SearchCandidate[]=searchDesignSpace({
  seed:input.seed,
  intent:input.intent,
  principles:input.principles,
  antiStyle:input.antiStyle,
  population:input.population??64,
  generations:input.generations??5,
  keep:input.keep??12
 });
 const candidates=found.map((c,i)=>{
  const genome=genomeFromTopology(`${input.seed}:${i}`,c.topology);
  return {
   rank:i+1,
   score:c.score,
   novelty:c.novelty,
   trace:c.trace,
   genomeId:genome.id,
   projection:projectGenomeSvg(genome)
  };
 });
 return {seed:input.seed,candidateCount:candidates.length,candidates};
}
