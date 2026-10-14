import type {GarmentConfiguration} from "./garment";
import {PILOT_SIZE_PROFILES} from "./shirt-measurements";
import {buildPilotShirtPattern} from "./pilot-shirt";
import {compileProductionManifest,type ProductionManifest} from "./production-package";
import {productionPieceSvg} from "./production-svg";
import {planPieceProjection,seamTransfers} from "./pattern-projector";
import {runTesseractBatch,type BatchInput,type BatchResult} from "./batch";
import type {MachineEnvelope} from "./manufacturing";

export type PilotRunInput=Omit<BatchInput,"garment"> & {sizeId?:string;machine?:MachineEnvelope};
export type PilotArtifact={fileName:string;mime:"image/svg+xml"|"application/json";content:string};
export type PilotRunResult={batch:BatchResult;manifest?:ProductionManifest;artifacts:PilotArtifact[];errors:string[]};

export function pilotGarment(sizeId="pilot-m"):GarmentConfiguration{
 const size=PILOT_SIZE_PROFILES.find(x=>x.id===sizeId)??PILOT_SIZE_PROFILES[1]!;
 const pattern=buildPilotShirtPattern(size);
 const zones=pattern.pieces.flatMap(p=>p.designZones.map((z,i)=>{
  const xs=z.polygon.map(q=>q.x),ys=z.polygon.map(q=>q.y);
  return {id:`${p.id}:${z.kind}:${i}`,kind:z.kind,surface:z.wrapGroupId?"tapered-cylinder" as const:"flat" as const,
   widthMm:Math.max(...xs)-Math.min(...xs),heightMm:Math.max(...ys)-Math.min(...ys),
   editable:true,wrapAllowed:!!z.wrapGroupId};
 }));
 return {id:`ascend-pilot-shirt:${size.id}`,garment:"buttoned-shirt",fit:"regular",size,lengthId:"standard",
  components:{collarId:"pilot-collar",sleeveId:"long-sleeve",cuffId:"button-cuff",placketId:"front-placket",yokeId:"single-yoke",closureId:"buttons"},
  material:{substrateId:"linen-woven",weightGsm:180,colorId:"natural"},zones};
}

export function runPilotProduction(input:PilotRunInput):PilotRunResult{
 const garment=pilotGarment(input.sizeId),pattern=buildPilotShirtPattern(garment.size);
 const batch=runTesseractBatch({...input,garment});
 const errors=batch.configurationIssues.filter(x=>x.severity==="error").map(x=>x.reason);
 if(!batch.candidates.length)return {batch,artifacts:[],errors:[...errors,"no-candidates"]};
 const winner=batch.candidates[0]!;
 if(input.machine&&batch.machine&&input.machine.id!==batch.machine.id)return {batch,artifacts:[],errors:[...errors,"machine-profile-mismatch"]};
 const manifest=compileProductionManifest({garment,pattern,genomeId:winner.genomeId,process:"machine-embroidery",machine:input.machine??batch.machine});
 for(const zone of winner.zones)for(const error of zone.manufacturingJob?.validation.errors??[])
  manifest.blockers.push(`zone-job:${zone.zoneId}:${error}`);
 if(manifest.blockers.length)manifest.productionApproved=false;
 const transfers=seamTransfers(pattern);
 const artifacts:PilotArtifact[]=pattern.pieces.map(piece=>({fileName:manifest.pieces.find(x=>x.pieceId===piece.id)!.vectorFileName,mime:"image/svg+xml",content:productionPieceSvg(piece,planPieceProjection(piece),transfers)}));
 if(batch.specimenSheet)artifacts.push({fileName:"lineage-specimens.svg",mime:"image/svg+xml",content:batch.specimenSheet.svg});
 artifacts.push({fileName:"production-manifest.json",mime:"application/json",content:JSON.stringify(manifest,null,2)});
 artifacts.push({fileName:"tesseract-batch.json",mime:"application/json",content:JSON.stringify(batch,null,2)});
 return {batch,manifest,artifacts,errors};
}
