import type {IntentVector,WeightedRef} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";
import type {GarmentConfiguration,GarmentZone} from "./garment";
import {designableZones,validateGarmentConfiguration,type CompatibilityRule,type ConfigurationIssue} from "./garment";
import {searchDesignSpace,type SearchCandidate} from "./search";
import {genomeFromTopology} from "./genome";
import {projectGenomeSvg,type SvgProjection} from "./svg-projector";
import {composeTopologyForZone,behaviorForZone,type ZoneBehavior} from "./zone-composer";
import {connectGarmentZones,type ContinuityEvent} from "./garment-continuity";

export type BatchInput={seed:string;intent:IntentVector;principles:PrincipleRecord[];antiStyle?:WeightedRef[];garment?:GarmentConfiguration;compatibilityRules?:CompatibilityRule[];population?:number;generations?:number;keep?:number};
export type ZoneProjection={zoneId:string;kind:GarmentZone["kind"];surface:GarmentZone["surface"];wrap:boolean;behavior:ZoneBehavior;svg:SvgProjection};
export type BatchCandidate={rank:number;score:number;novelty:number;trace:string[];genomeId:string;projection:SvgProjection;zones:ZoneProjection[];continuity:ContinuityEvent[]};
export type BatchResult={seed:string;candidateCount:number;garmentId?:string;configurationIssues:ConfigurationIssue[];candidates:BatchCandidate[]};

function zoneCanvas(z:GarmentZone){return {width:Math.max(160,Math.round(z.circumferenceMm??z.widthMm??800)),height:Math.max(80,Math.round(z.heightMm??240))};}

export function runTesseractBatch(input:BatchInput):BatchResult{
 const issues=input.garment?validateGarmentConfiguration(input.garment,input.compatibilityRules??[]):ConfigurationIssue[]=[];
 if(issues.some(x=>x.severity==="error"))return {seed:input.seed,candidateCount:0,garmentId:input.garment?.id,configurationIssues:issues,candidates:[]};
 const intent:IntentVector={...input.intent,materialId:input.garment?.material.substrateId??input.intent.materialId};
 const found:SearchCandidate[]=searchDesignSpace({seed:input.seed,intent,principles:input.principles,antiStyle:input.antiStyle,population:input.population??64,generations:input.generations??5,keep:input.keep??12});
 const zones=input.garment?designableZones(input.garment):[];
 const candidates=found.map((c,i)=>{
  const genome=genomeFromTopology(`${input.seed}:${i}`,c.topology),projection=projectGenomeSvg(genome);
  const zoneTopologies=Object.fromEntries(zones.map(z=>[z.id,composeTopologyForZone(c.topology,z,`${input.seed}:${i}`)]));
  const zoneProjections=zones.map(z=>{const canvas=zoneCanvas(z),zoneTopology=zoneTopologies[z.id]!,zoneGenome=genomeFromTopology(`${input.seed}:${i}:${z.id}`,zoneTopology);return {zoneId:z.id,kind:z.kind,surface:z.surface,wrap:z.wrapAllowed,behavior:behaviorForZone(z.kind),svg:projectGenomeSvg(zoneGenome,canvas.width,canvas.height)};});
  const continuity=input.garment?connectGarmentZones(input.garment,zoneTopologies):[];
  return {rank:i+1,score:c.score,novelty:c.novelty,trace:[...c.trace,`garment:${input.garment?.id??"none"}`,`zones:${zoneProjections.length}`,`continuity:${continuity.length}`],genomeId:genome.id,projection,zones:zoneProjections,continuity};
 });
 return {seed:input.seed,candidateCount:candidates.length,garmentId:input.garment?.id,configurationIssues:issues,candidates};
}
