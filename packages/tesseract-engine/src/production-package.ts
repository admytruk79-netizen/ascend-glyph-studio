import type {GarmentConfiguration} from "./garment";
import type {MachineEnvelope,ConfidenceState} from "./manufacturing";
import type {ShirtPattern} from "./pattern";
import {planPieceProjection,seamTransfers,type PieceProjectionPlan,type SeamTransfer} from "./pattern-projector";
import {validatePattern} from "./pattern";

export type ProductionProcess="machine-embroidery"|"screen-print"|"dtg"|"leather-tooling"|"laser-engraving";

export type PieceProductionFile={
 pieceId:string;kind:string;projection:PieceProjectionPlan;
 vectorFileName:string;dimensionsMm:{width:number;height:number};
};

export type ProductionManifest={
 id:string;createdFrom:{garmentId:string;patternId:string;genomeId:string};
 process:ProductionProcess;material:{substrateId:string;weightGsm?:number;colorId:string;shrinkagePct?:number};
 machine?:{id:string;maker:string;model:string;sourceId:string};
 confidence:ConfidenceState;productionApproved:boolean;
 pieces:PieceProductionFile[];seamTransfers:SeamTransfer[];
 warnings:string[];blockers:string[];
};

function bounds(poly:{x:number;y:number}[]){const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y);return {w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}

export function compileProductionManifest(args:{
 garment:GarmentConfiguration;pattern:ShirtPattern;genomeId:string;
 process:ProductionProcess;machine?:MachineEnvelope;
}):ProductionManifest{
 const {garment,pattern,genomeId,process,machine}=args;
 const patternErrors=validatePattern(pattern),warnings:string[]=[],blockers=[...patternErrors];
 const pieces=pattern.pieces.map(p=>{
  const projection=planPieceProjection(p),b=bounds(p.outline);
  warnings.push(...projection.warnings.map(w=>`${p.id}:${w}`));
  return {pieceId:p.id,kind:p.kind,projection,vectorFileName:`${pattern.id.replace(/[^a-z0-9_-]/gi,"_")}__${p.id}.svg`,dimensionsMm:{width:b.w,height:b.h}};
 });
 const transfers=seamTransfers(pattern);
 if(transfers.some(x=>!x.allowed))warnings.push("one-or-more-seams-disallow-design-crossing");
 if(!machine&&process==="machine-embroidery")blockers.push("embroidery-machine-not-selected");
 if(pattern.pieces.some(p=>p.sourceState==="reference"))blockers.push("reference-pattern-requires-validation");
 const confidence:ConfidenceState=pattern.pieces.every(p=>p.sourceState==="production-validated")?"production-validated":
  pattern.pieces.every(p=>p.sourceState==="manufacturer-validated"||p.sourceState==="production-validated")?"manufacturer-validated":
  pattern.pieces.every(p=>p.sourceState!=="reference")?"pattern-specified":"reference-published";
 const productionApproved=confidence==="production-validated"&&blockers.length===0;
 return {id:`production:${garment.id}:${genomeId}`,createdFrom:{garmentId:garment.id,patternId:pattern.id,genomeId},
  process,material:garment.material,machine:machine?{id:machine.id,maker:machine.maker,model:machine.model,sourceId:machine.sourceId}:undefined,
  confidence,productionApproved,pieces,seamTransfers:transfers,warnings:[...new Set(warnings)],blockers:[...new Set(blockers)]};
}

export function manifestToJson(m:ProductionManifest){return JSON.stringify(m,null,2);}
