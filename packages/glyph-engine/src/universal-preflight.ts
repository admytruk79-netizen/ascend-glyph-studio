import {ManufacturingProcessProfile,validateProcessProfile} from "./manufacturing-process";
import {PointMm,ProductGeometry,SurfaceKind,validateProductGeometry} from "./product-geometry";

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
const box=(p:PointMm[])=>({minX:Math.min(...p.map(x=>x.x)),maxX:Math.max(...p.map(x=>x.x)),minY:Math.min(...p.map(x=>x.y)),maxY:Math.max(...p.map(x=>x.y))});
const intersects=(a:ReturnType<typeof box>,b:ReturnType<typeof box>)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY;
export function preflightProduction(geometry:ProductGeometry,profile:ManufacturingProcessProfile,artwork:ArtworkPlacement[]):PreflightResult{
 const errors=[...validateProductGeometry(geometry),...validateProcessProfile(profile)],warnings:string[]=[];
 const zones=new Map(geometry.zones.map(z=>[z.id,z]));
 for(const a of artwork){
  const z=zones.get(a.zoneId);if(!z){errors.push(`unknown-zone:${a.id}:${a.zoneId}`);continue}
  if(a.bounds.length<3||a.bounds.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){errors.push(`invalid-artwork-bounds:${a.id}`);continue}
  if(!surfaceProcesses[z.surface].has(profile.process))errors.push(`unsupported-surface-process:${a.id}:${z.surface}:${profile.process}`);
  const zb=box(z.outline),ab=box(a.bounds),s=z.safeInsetMm;
  if(ab.minX<zb.minX+s||ab.maxX>zb.maxX-s||ab.minY<zb.minY+s||ab.maxY>zb.maxY-s)errors.push(`outside-safe-area:${a.id}`);
  for(const n of z.noGoZones??[]){const nb=box(n.outline),c=n.clearanceMm;if(intersects(ab,{minX:nb.minX-c,maxX:nb.maxX+c,minY:nb.minY-c,maxY:nb.maxY+c}))errors.push(`no-go-intersection:${a.id}:${n.id}`)}
  if(profile.constraints.minLineMm!==undefined&&a.minLineMm<profile.constraints.minLineMm)errors.push(`line-too-thin:${a.id}`);
  if(profile.constraints.minGapMm!==undefined&&a.minGapMm<profile.constraints.minGapMm)errors.push(`gap-too-small:${a.id}`);
  if(profile.constraints.registrationToleranceMm!==undefined&&a.registrationDemandMm!==undefined&&a.registrationDemandMm<profile.constraints.registrationToleranceMm)errors.push(`registration-too-tight:${a.id}`);
  const area=Math.max(0,ab.maxX-ab.minX)*Math.max(0,ab.maxY-ab.minY);
  if(profile.constraints.maxAreaMm2!==undefined&&area>profile.constraints.maxAreaMm2)errors.push(`area-too-large:${a.id}`);
 }
 if(!artwork.length)warnings.push("no-artwork-placements");
 return{valid:!errors.length,errors,warnings};
}
