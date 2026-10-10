import type {HierarchicalReconstruction} from "./hierarchical-reconstruction";
export type BenchmarkSplit="train"|"validation"|"holdout";
export type Point={x:number;y:number};
export type GroundTruthComponent={id:string;kind:string;polygon:Point[];parentId?:string};
export type GroundTruthTransform={kind:"mirror"|"rotate"|"repeat"|"scale";from:string;to:string;matrix:[number,number,number,number,number,number];tolerancePx:number};
export type ReconstructionBenchmarkCase={id:string;split:BenchmarkSplit;sourceId:string;width:number;height:number;components:GroundTruthComponent[];axes:{a:Point;b:Point}[];repeatVectors:Point[];relations:GroundTruthTransform[];reviewedBy:string[];notes?:string[]};
export type ReconstructionMetrics={componentRecall:number;nodeKindAccuracy:number;relationRecall:number;negativeSpaceAbsError:number};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function scoreStructuralReconstruction(pred:HierarchicalReconstruction,truth:ReconstructionBenchmarkCase,truthNegativeSpace?:number):ReconstructionMetrics{
 const kinds=new Set(truth.components.map(x=>x.kind));const predKinds=pred.nodes.map(x=>x.kind);
 const matched=predKinds.filter(k=>kinds.has(k)).length;
 const relationKinds=new Set(truth.relations.map(x=>x.kind));const relationMatched=pred.relations.filter(x=>relationKinds.has(x.rule as any)).length;
 return {componentRecall:clamp(matched/Math.max(1,truth.components.length)),nodeKindAccuracy:clamp(matched/Math.max(1,pred.nodes.length)),relationRecall:clamp(relationMatched/Math.max(1,truth.relations.length)),negativeSpaceAbsError:truthNegativeSpace===undefined?0:Math.abs(pred.negativeSpace-truthNegativeSpace)};
}
export function assertLeakageSafe(cases:ReconstructionBenchmarkCase[]){
 const bySource=new Map<string,BenchmarkSplit>();for(const c of cases){const prior=bySource.get(c.sourceId);if(prior&&prior!==c.split)throw new Error("Benchmark leakage for source "+c.sourceId);bySource.set(c.sourceId,c.split)}
}
