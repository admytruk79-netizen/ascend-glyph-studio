import type {IntentVector,Tesseract8DState,WeightedRef} from "./dimensions";
import {compileIntent} from "./intent";
import {retrievePrinciples,provenanceOf,refs,type PrincipleRecord} from "./knowledge";
import {buildTopology,type Topology} from "./topology";
import {evaluateTopology} from "./evaluate";

export type SolveV2Input={seed:string;intent:IntentVector;principles:PrincipleRecord[];ontologyVersion:string;antiStyle?:WeightedRef[]};
export type Solved8D={state:Tesseract8DState;topology:Topology;score:number;trace:string[]};

export function solve8D(input:SolveV2Input):Solved8D{
 const plan=compileIntent(input.intent);
 const principles=retrievePrinciples(plan.intent,input.principles);
 const topology=buildTopology(plan.semanticSkeleton,principles);
 const evaluation=evaluateTopology(topology,plan.semanticSkeleton.length,principles.length,input.antiStyle);
 const provenance=principles.flatMap(provenanceOf);
 const state:Tesseract8DState={
  version:2,seed:input.seed,ontologyVersion:input.ontologyVersion,solverVersion:"2.0.0-alpha.1",
  dimensions:{
   geometry:refs(topology.nodes.map(n=>n.form)),
   semantics:plan.intent.concepts,
   culture:refs(principles.map(p=>p.traditionId)),
   relations:refs(topology.edges.map(e=>e.relation)),
   hierarchy:refs(topology.nodes.map(n=>`scale-${n.scale}`)),
   transformation:refs(topology.edges.filter(e=>["transform","terminate","return","intersect","branch"].includes(e.relation)).map(e=>e.relation)),
   material:refs([plan.intent.materialId??"unspecified"],.5),
   provenance
  },
  complexity:evaluation.complexity,antiStyle:input.antiStyle??[]
 };
 return {state,topology,score:evaluation.score,trace:[
  `semantic-steps:${plan.semanticSkeleton.length}`,`principles:${principles.length}`,
  `topology:${topology.nodes.length}n/${topology.edges.length}e`,`score:${evaluation.score.toFixed(2)}`
 ]};
}
