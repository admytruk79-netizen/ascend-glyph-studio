import type {MachineTemplate} from "./machine-template";
import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";

/**
 * Conservative, geometry-only multi-hoop candidate planning.
 * It NEVER splits stitch objects, rotates stitch coordinates, emits machine files,
 * or certifies registration. Manufacturer setup and sew-out remain mandatory.
 */
export type HoopTile={
 id:string;
 sourceObjectIds:string[];
 boundsMm:{x:number;y:number;width:number;height:number};
 hoopOriginMm:{x:number;y:number};
};
export type HoopSegmentationCandidate={
 schema:"ascend.hoop-segmentation.candidate.v1";
 status:"reference-only";
 fieldMm:{width:number;height:number};
 tiles:HoopTile[];
 errors:string[];
 releaseBlockers:string[];
};

type Bounds={minX:number;minY:number;maxX:number;maxY:number};
const points=(o:StitchIrObject):StitchIrPoint[]=>o.kind==="fill"?o.polygon:o.path;
const union=(a:Bounds,b:Bounds):Bounds=>({
 minX:Math.min(a.minX,b.minX),minY:Math.min(a.minY,b.minY),
 maxX:Math.max(a.maxX,b.maxX),maxY:Math.max(a.maxY,b.maxY)
});
const fits=(b:Bounds,w:number,h:number)=>b.maxX-b.minX<=w+1e-8&&b.maxY-b.minY<=h+1e-8;
const rect=(b:Bounds)=>({x:b.minX,y:b.minY,width:b.maxX-b.minX,height:b.maxY-b.minY});

export function planHoopSegmentationCandidates(
 objects:readonly StitchIrObject[],
 opts:{widthMm:number;heightMm:number;machine:MachineTemplate;maxTiles?:number}
):HoopSegmentationCandidate{
 const {machine,widthMm,heightMm}=opts;
 const fieldMm={width:machine.fieldX.value,height:machine.fieldY.value};
 const errors:string[]=[];
 const releaseBlockers=[
  "registration-marks-and-cross-hoop-continuity-unverified",
  "manufacturer-hoop-orientation-and-fixturing-unverified",
  "material-calibration-and-physical-sew-out-required"
 ];
 const result=(tiles:HoopTile[]):HoopSegmentationCandidate=>({
  schema:"ascend.hoop-segmentation.candidate.v1",status:"reference-only",
  fieldMm,tiles,errors,releaseBlockers
 });
 if(machine.fieldX.unit!=="mm"||machine.fieldY.unit!=="mm"||
    !Number.isFinite(fieldMm.width)||!Number.isFinite(fieldMm.height)||
    fieldMm.width<=0||fieldMm.height<=0){
  errors.push("machine-field-unverified");return result([]);
 }
 if(!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||widthMm<=0||heightMm<=0){
  errors.push("invalid-job-size");return result([]);
 }
 if(!objects.length){errors.push("no-stitch-objects");return result([]);}
 const maxTiles=opts.maxTiles??128;
 if(!Number.isInteger(maxTiles)||maxTiles<1||maxTiles>128){
  errors.push("invalid-tile-limit");return result([]);
 }
 const seen=new Set<string>();
 const items:{id:string;bounds:Bounds}[]=[];
 for(const o of objects){
  if(seen.has(o.id)){errors.push("duplicate-source-id:"+o.id);continue;}
  seen.add(o.id);
  const ps=points(o);
  if(ps.length<2||ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){
   errors.push("invalid-path:"+o.id);continue;
  }
  // Linear scan avoids spreading an unbounded stitch path into function arguments.
  const bounds:Bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
  for(const p of ps){
   bounds.minX=Math.min(bounds.minX,p.x);bounds.minY=Math.min(bounds.minY,p.y);
   bounds.maxX=Math.max(bounds.maxX,p.x);bounds.maxY=Math.max(bounds.maxY,p.y);
  }
  if(bounds.minX<0||bounds.minY<0||bounds.maxX>widthMm||bounds.maxY>heightMm){
   errors.push("outside-job-envelope:"+o.id);continue;
  }
  if(!fits(bounds,fieldMm.width,fieldMm.height)){
   errors.push("object-exceeds-machine-field:"+o.id);continue;
  }
  items.push({id:o.id,bounds});
 }
 if(errors.length)return result([]);
 // Stable input-order-independent grouping; never cut an individual motif.
 items.sort((a,b)=>a.bounds.minY-b.bounds.minY||
  a.bounds.minX-b.bounds.minX||a.id.localeCompare(b.id));
 const groups:{bounds:Bounds;ids:string[]}[]=[];
 for(const item of items){
  const existing=groups.find(g=>fits(union(g.bounds,item.bounds),fieldMm.width,fieldMm.height));
  if(existing){
   existing.bounds=union(existing.bounds,item.bounds);
   existing.ids.push(item.id);
  }else{
   if(groups.length>=maxTiles){errors.push("tile-limit-exceeded");return result([]);}
   groups.push({bounds:item.bounds,ids:[item.id]});
  }
 }
 return result(groups.map((g,i)=>({
  id:"hoop-"+String(i+1).padStart(3,"0"),
  sourceObjectIds:g.ids,
  boundsMm:rect(g.bounds),
  hoopOriginMm:{x:g.bounds.minX,y:g.bounds.minY}
 })));
}
