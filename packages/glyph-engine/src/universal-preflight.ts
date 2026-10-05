import {ManufacturingProcessProfile,validateProcessProfile} from "./manufacturing-process";
import {PointMm,ProductGeometry,SurfaceKind,validateProductGeometry} from "./product-geometry";
import {polygonArea,polygonDistance,polygonInsideWithClearance} from "./polygon-geometry";

export interface ArtworkPlacement{
 id:string;zoneId:string;bounds:PointMm[];minLineMm:number;minGapMm:number;
 registrationDemandMm?:number;
}
export interface PreflightResult{valid:boolean;errors:string[];warnings:string[]}
const surfaceProcesses:Record<SurfaceKind,Set<string>>={
 flat:new Set(["print","embroidery","engraving","laser","weaving","cut-sew","other"]),
 folded:new Set(["print","embroidery","engraving","laser","cut-sew","other"]),
 cylinder:new Set(["print","engraving","laser","other"]),
 "tapered-cylinder":new Set(["print","engraving","laser","other"]),
 "sewn-piece":new Set(["print","embroidery","weaving","cut-sew","other"]),
 freeform:new Set(["other"])
};
export function preflightProduction(geometry:ProductGeometry,profile:ManufacturingProcessProfile,artwork:ArtworkPlacement[]):PreflightResult{
 const errors=[...validateProductGeometry(geometry),...validateProcessProfile(profile)],warnings:string[]=[];
 const zones=new Map(geometry.zones.map(z=>[z.id,z]));
 for(const a of artwork){
  const z=zones.get(a.zoneId);if(!z){errors.push(`unknown-zone:${a.id}:${a.zoneId}`);continue}
  if(a.bounds.length<3||a.bounds.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){errors.push(`invalid-artwork-bounds:${a.id}`);continue}
  if(!surfaceProcesses[z.surface].has(profile.process))errors.push(`unsupported-surface-process:${a.id}:${z.surface}:${profile.process}`);
  if(!polygonInsideWithClearance(a.bounds,z.outline,z.safeInsetMm))errors.push(`outside-safe-area:${a.id}`);
  for(const n of z.noGoZones??[])if(polygonDistance(a.bounds,n.outline)<n.clearanceMm)errors.push(`no-go-intersection:${a.id}:${n.id}`);
  if(profile.constraints.minLineMm!==undefined&&a.minLineMm<profile.constraints.minLineMm)errors.push(`line-too-thin:${a.id}`);
  if(profile.constraints.minGapMm!==undefined&&a.minGapMm<profile.constraints.minGapMm)errors.push(`gap-too-small:${a.id}`);
  if(profile.constraints.registrationToleranceMm!==undefined&&a.registrationDemandMm!==undefined&&a.registrationDemandMm<profile.constraints.registrationToleranceMm)errors.push(`registration-too-tight:${a.id}`);
  const area=polygonArea(a.bounds);
  if(profile.constraints.maxAreaMm2!==undefined&&area>profile.constraints.maxAreaMm2)errors.push(`area-too-large:${a.id}`);
 }
 if(!artwork.length)warnings.push("no-artwork-placements");
 return{valid:!errors.length,errors,warnings};
}
