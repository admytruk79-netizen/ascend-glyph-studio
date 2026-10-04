import type {SearchInput,SearchCandidate} from "./search";
import {searchDesignSpace} from "./search";
import {paretoSelect} from "./pareto";
import {renderLineageSpecimenSheet,type SpecimenSheet} from "./specimen-sheet";

export type LineageLabInput=Omit<SearchInput,"seed"|"keep">&{
 seeds?:string[];keepPerSeed?:number;finalKeep?:number;sheetColumns?:number
};
export type LineageLabResult={
 runs:number;rawCandidates:number;uniqueLineages:number;survivors:SearchCandidate[];
 specimenSheet:SpecimenSheet;lineageCounts:Record<string,number>
};

const defaultSeeds=[
 "axis-return","ancestry-branch","freedom-crossing","protection-torus",
 "void-renewal","radial-ascent","opposition-choice","orbit-lineage"
];

export function runLineageLab(input:LineageLabInput):LineageLabResult{
 const seeds=input.seeds?.length?input.seeds:defaultSeeds;
 const keepPerSeed=Math.max(4,Math.min(input.keepPerSeed??16,32));
 const finalKeep=Math.max(8,Math.min(input.finalKeep??48,96));
 const all:SearchCandidate[]=[];
 for(const seed of seeds){
  all.push(...searchDesignSpace({...input,seed,keep:keepPerSeed}));
 }
 const lineageCounts:Record<string,number>={};
 for(const c of all)lineageCounts[c.lineageId]=(lineageCounts[c.lineageId]??0)+1;

 const bestByLineage=new Map<string,SearchCandidate>();
 for(const c of all){
  const prev=bestByLineage.get(c.lineageId);
  if(!prev||c.score>prev.score)bestByLineage.set(c.lineageId,c);
 }
 const unique=[...bestByLineage.values()];
 const survivors=paretoSelect(unique.map(item=>({item,objectives:item.objectives})),Math.min(finalKeep,unique.length)).map(x=>x.item);
 const specimenSheet=renderLineageSpecimenSheet(survivors.map(c=>({
  lineageId:c.lineageId,topology:c.topology,objectives:c.objectives,score:c.score
 })),{columns:input.sheetColumns??4,cellWidth:390,cellHeight:240,padding:20});
 return {runs:seeds.length,rawCandidates:all.length,uniqueLineages:unique.length,survivors,specimenSheet,lineageCounts};
}
