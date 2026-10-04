import type {IntentVector,WeightedRef} from "./dimensions";
import type {PrincipleRecord} from "./knowledge";
import type {GarmentConfiguration,GarmentZone} from "./garment";
import {designableZones,validateGarmentConfiguration,type CompatibilityRule,type ConfigurationIssue} from "./garment";
import {searchDesignSpace,type SearchCandidate} from "./search";
import {genomeFromTopology} from "./genome";
import {projectGenomeSvg,type SvgProjection} from "./svg-projector";
import {projectSemanticGeometry,renderZoneTrajectories} from "./semantic-projector";
import {composeTopologyForZone,behaviorForZone,type ZoneBehavior} from "./zone-composer";
import {connectGarmentZones,type ContinuityEvent} from "./garment-continuity";
import {planContinuityRegistration,type ContinuitySegment} from "./continuity-registration";
import {buildGarmentTrajectories,injectTrajectoryMetadata,type GarmentTrajectory} from "./garment-trajectory";
import {buildGarmentAtlas} from "./garment-atlas";
import {renderGarmentAtlasSvg,type GarmentSvg} from "./garment-svg";
import {planPrimitiveEvolution,type EvolutionPlan} from "./evolution";
import type {ImageObservation} from "./image-corpus";
import {topologyVisualVector} from "./candidate-visual-vector";
import {assessVisual,type VisualAssessment} from "./visual-assessment";
import {adaptForProduction,type MediumId,type ProductionAdaptation} from "./medium-compiler";
import {assessManufacturability,type ManufacturabilityReport} from "./manufacturability";
import {expandRecursiveGrammar,grammarComplexity} from "./recursive-grammar";

export type BatchInput={seed:string;intent:IntentVector;principles:PrincipleRecord[];antiStyle?:WeightedRef[];garment?:GarmentConfiguration;compatibilityRules?:CompatibilityRule[];visualCorpus?:ImageObservation[];medium?:MediumId;population?:number;generations?:number;keep?:number};
export type ZoneProjection={zoneId:string;kind:GarmentZone["kind"];surface:GarmentZone["surface"];wrap:boolean;behavior:ZoneBehavior;svg:SvgProjection};
export type BatchCandidate={rank:number;score:number;novelty:number;trace:string[];genomeId:string;projection:SvgProjection;zones:ZoneProjection[];continuity:ContinuityEvent[];registration:ContinuitySegment[];trajectories:GarmentTrajectory[];garmentProjection?:GarmentSvg;evolution:EvolutionPlan;visualAssessment?:VisualAssessment;productionAdaptation?:ProductionAdaptation;manufacturability?:ManufacturabilityReport};
export type BatchResult={seed:string;candidateCount:number;garmentId?:string;configurationIssues:ConfigurationIssue[];candidates:BatchCandidate[]};

function zoneCanvas(z:GarmentZone){return {width:Math.max(160,Math.round(z.circumferenceMm??z.widthMm??800)),height:Math.max(80,Math.round(z.heightMm??240))};}

export function runTesseractBatch(input:BatchInput):BatchResult{
 const issues:ConfigurationIssue[]=input.garment?validateGarmentConfiguration(input.garment,input.compatibilityRules??[]):[];
 if(issues.some(x=>x.severity==="error"))return {seed:input.seed,candidateCount:0,garmentId:input.garment?.id,configurationIssues:issues,candidates:[]};
 const intent:IntentVector={...input.intent,materialId:input.garment?.material.substrateId??input.intent.materialId};
 const found:SearchCandidate[]=searchDesignSpace({seed:input.seed,intent,principles:input.principles,antiStyle:input.antiStyle,visualCorpus:input.visualCorpus,population:input.population??64,generations:input.generations??5,keep:input.keep??12});
 const zones=input.garment?designableZones(input.garment):[];
 const candidates=found.map((c,i)=>{
  const enriched=expandRecursiveGrammar(c.topology,`${input.seed}:${i}`,{depth:2,maxNodes:48,mutationRate:.2}),complexity=grammarComplexity(enriched);
  const productionAdaptation=input.medium?adaptForProduction(enriched,input.medium):undefined;
  const effectiveTopology=productionAdaptation?.topology??enriched;
  const manufacturability=input.medium?assessManufacturability(effectiveTopology,input.medium):undefined;
  const evolution=planPrimitiveEvolution(effectiveTopology);
  const visualAssessment=input.visualCorpus?.length?assessVisual(topologyVisualVector(effectiveTopology),input.visualCorpus):undefined;
  const genome=genomeFromTopology(`${input.seed}:${i}`,effectiveTopology),projection=projectSemanticGeometry(genome);
  const zoneTopologies=Object.fromEntries(zones.map(z=>[z.id,composeTopologyForZone(effectiveTopology,z,`${input.seed}:${i}`)]));
  let zoneProjections=zones.map(z=>{const canvas=zoneCanvas(z),zoneTopology=zoneTopologies[z.id]!,zoneGenome=genomeFromTopology(`${input.seed}:${i}:${z.id}`,zoneTopology);return {zoneId:z.id,kind:z.kind,surface:z.surface,wrap:z.wrapAllowed,behavior:behaviorForZone(z.kind),svg:projectSemanticGeometry(zoneGenome,canvas.width,canvas.height,z)};});
  const continuity=input.garment?connectGarmentZones(input.garment,zoneTopologies):[];
  const registration=input.garment?planContinuityRegistration(input.garment,continuity):[];
  const trajectories=input.garment?buildGarmentTrajectories(input.garment,registration):[];
  zoneProjections=injectTrajectoryMetadata(zoneProjections,trajectories).map(z=>({...z,svg:renderZoneTrajectories(z.svg,z.zoneId,trajectories)}));
  const garmentProjection=input.garment?renderGarmentAtlasSvg(buildGarmentAtlas(input.garment),trajectories):undefined;
  return {rank:i+1,score:c.score,novelty:c.novelty,trace:[...c.trace,`garment:${input.garment?.id??"none"}`,`zones:${zoneProjections.length}`,`continuity:${continuity.length}`,`registration:${registration.filter(x=>x.manufacturable).length}/${registration.length}`,`trajectories:${trajectories.length}`,`grammar:${complexity.score.toFixed(2)}`,`recursive:${complexity.recursive}`],genomeId:genome.id,projection,zones:zoneProjections,continuity,registration,trajectories,garmentProjection,evolution,visualAssessment,productionAdaptation,manufacturability};
 });
 return {seed:input.seed,candidateCount:candidates.length,garmentId:input.garment?.id,configurationIssues:issues,candidates};
}
