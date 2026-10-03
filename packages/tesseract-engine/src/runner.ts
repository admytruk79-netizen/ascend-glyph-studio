import {searchDesignSpace,type SearchCandidate} from "./search";
import {genomeFromTopology} from "./genome";
import {projectGenomeSvg} from "./svg-projector";
import type {IntentVector,WeightedRef,CulturalAccess} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";

export type DbPrincipleRow={
 id:string;tradition_id:string;principle_kind:string;confidence:number|string;cultural_access:CulturalAccess;
 abstraction?:{concepts?:string[];relations?:string[];forms?:string[];tags?:string[]}|null;
 source_ids?:string[]|null;
};
export type PersistedCandidate={
 ordinal:number;score:number;novelty:number;state:{seed:string;trace:string[];svg:string;featureMap:Record<string,string>;topology:SearchCandidate["topology"]};
 complexity:Record<string,number>;disposition:"candidate";
};
export type ExecuteRunInput={
 seed:string;intent:IntentVector;principleRows:DbPrincipleRow[];antiStyle?:WeightedRef[];
 population?:number;generations?:number;keep?:number;
};

export function principleRowsToRecords(rows:DbPrincipleRow[]):PrincipleRecord[]{
 return rows.map(r=>({
  id:r.id,traditionId:r.tradition_id,kind:r.principle_kind,
  concepts:r.abstraction?.concepts??[],relations:r.abstraction?.relations??[],
  forms:r.abstraction?.forms??[],tags:r.abstraction?.tags??[],
  confidence:Number(r.confidence),access:r.cultural_access,sourceIds:r.source_ids??[]
 }));
}

function complexityOf(c:SearchCandidate){
 const n=Math.max(1,c.topology.nodes.length),rels=new Set(c.topology.edges.map(e=>e.relation));
 return {topological:Math.min(1,c.topology.edges.length/(n+3)),semantic:Math.min(1,n/8),
  hierarchical:Math.min(1,new Set(c.topology.nodes.map(x=>x.scale)).size/4),rhythmic:Math.min(1,rels.size/8),
  transformational:Math.min(1,c.topology.edges.filter(x=>["transform","terminate","return","intersect","branch"].includes(x.relation)).length/6),
  cultural:0,visual:Math.min(1,(new Set(c.topology.nodes.map(x=>x.form)).size+rels.size)/(n+8)),production:Math.min(1,(n+c.topology.edges.length)/24)};
}

export function executeRun(input:ExecuteRunInput):PersistedCandidate[]{
 const principles=principleRowsToRecords(input.principleRows);
 const found=searchDesignSpace({seed:input.seed,intent:input.intent,principles,antiStyle:input.antiStyle,population:input.population??64,generations:input.generations??5,keep:input.keep??12});
 return found.map((c,ordinal)=>{
  const genome=genomeFromTopology(`${input.seed}:${ordinal}`,c.topology),projection=projectGenomeSvg(genome);
  return {ordinal,score:c.score,novelty:c.novelty,state:{seed:input.seed,trace:c.trace,svg:projection.svg,featureMap:projection.featureMap,topology:c.topology},complexity:complexityOf(c),disposition:"candidate" as const};
 });
}

// Runtime adapters should:
// 1. claim one synthesis_run with status='queued' or 'running';
// 2. load knowledge_principle rows + source ids from knowledge_relation;
// 3. call executeRun();
// 4. persist synthesis_candidate rows transactionally;
// 5. set run status='completed' only after all candidates are durable.
// This module deliberately contains no DB credentials and no hidden network side effects.
