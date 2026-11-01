import type {HoopTile} from "./hoop-segmentation";

/**
 * Reference-only connectivity of rectangular machine fields at proposed origins.
 * This is NOT registration feasibility: a shared rectangle does not establish
 * a safe mark location, accessible fixture, allowable orientation or tolerance.
 */
export type HoopRegistrationGeometryAudit={
 schema:"ascend.hoop-registration.geometry-audit.v1";
 status:"reference-only";
 fieldOverlapLinks:{
  fromTileId:string;toTileId:string;
  overlapMm:{x:number;y:number;width:number;height:number};
 }[];
 connectedByFieldOverlap:boolean;
 unreachableFromFirstTileIds:string[];
 warnings:string[];
};

export function auditHoopRegistrationGeometry(
 tiles:readonly HoopTile[],fieldMm:{width:number;height:number}
):HoopRegistrationGeometryAudit{
 const warnings=["registration-marks-fixturing-and-seam-continuity-unverified"];
 const links:HoopRegistrationGeometryAudit["fieldOverlapLinks"]=[];
 if(!Number.isFinite(fieldMm.width)||!Number.isFinite(fieldMm.height)||
    fieldMm.width<=0||fieldMm.height<=0||
    tiles.some(t=>!Number.isFinite(t.hoopOriginMm.x)||!Number.isFinite(t.hoopOriginMm.y))){
  return {
   schema:"ascend.hoop-registration.geometry-audit.v1",status:"reference-only",
   fieldOverlapLinks:[],connectedByFieldOverlap:false,
   unreachableFromFirstTileIds:tiles.map(t=>t.id),
   warnings:[...warnings,"invalid-reference-field-or-origin"]
  };
 }
 const adjacency=tiles.map(()=>new Set<number>());
 for(let i=0;i<tiles.length;i++){
  for(let j=i+1;j<tiles.length;j++){
   const a=tiles[i]!.hoopOriginMm,b=tiles[j]!.hoopOriginMm;
   const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
   const width=Math.min(a.x+fieldMm.width,b.x+fieldMm.width)-x;
   const height=Math.min(a.y+fieldMm.height,b.y+fieldMm.height)-y;
   // Touching edges have zero shared area, so do not imply a corridor.
   if(width>0&&height>0){
    links.push({fromTileId:tiles[i]!.id,toTileId:tiles[j]!.id,
     overlapMm:{x,y,width,height}});
    adjacency[i]!.add(j);adjacency[j]!.add(i);
   }
  }
 }
 const reached=new Set<number>();
 if(tiles.length){
  const queue=[0];reached.add(0);
  for(let k=0;k<queue.length;k++){
   for(const next of adjacency[queue[k]!]!){
    if(!reached.has(next)){reached.add(next);queue.push(next);}
   }
  }
 }
 const unreachableFromFirstTileIds=tiles.filter((_,i)=>!reached.has(i)).map(t=>t.id);
 if(unreachableFromFirstTileIds.length){
  warnings.push("no-continuous-shared-field-corridor-external-registration-datum-required");
 }
 return {
  schema:"ascend.hoop-registration.geometry-audit.v1",status:"reference-only",
  fieldOverlapLinks:links,connectedByFieldOverlap:unreachableFromFirstTileIds.length===0,
  unreachableFromFirstTileIds,warnings
 };
}
