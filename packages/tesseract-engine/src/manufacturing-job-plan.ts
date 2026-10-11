import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";
import {routingMetrics} from "./stitch-travel-optimizer";
import {compileLoomPlan,type LoomPlan} from "./loom-program";
import {liftPlanToShaftDraft,type ShaftDraft} from "./historical-shaft-draft";

/** Neutral manufacturing operation plan: CAM-style operations and postprocessor
 * separation (FreeCAD), embroidery object routing (Ink/Stitch), historical
 * threading/tieup/treadling (WIF). No machine approval without sew-out.
 */
export type ManufacturingOperation=
 |{kind:"stitch";id:string;sourceId:string;stitchType:StitchIrObject["kind"];color:string}
 |{kind:"jump";id:string;distanceMm:number;from:StitchIrPoint;to:StitchIrPoint}
 |{kind:"color-change";id:string;from:string;to:string}
 |{kind:"trim";id:string;reason:"long-jump"}
 |{kind:"loom-pick";id:string;row:number;lifts:string};

export type ManufacturingJobPlan={
 schema:"ascend.manufacturing.job.v1";
 process:"embroidery"|"weaving";
 widthMm:number;heightMm:number;
 operations:ManufacturingOperation[];
 sourceObjectIds:string[];
 metrics:{travelMm:number;colorChanges:number;longJumps:number;operationCount:number};
 validation:{valid:boolean;errors:string[];warnings:string[]};
 loom?:{liftPlan:LoomPlan;shaftDraft:ShaftDraft};
};
const pts=(o:StitchIrObject):StitchIrPoint[]=>o.kind==="fill"?o.polygon:o.path;
const d=(a:StitchIrPoint,b:StitchIrPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function geometryErrors(objects:readonly StitchIrObject[],w:number,h:number){
 const errors:string[]=[];
 if(!Number.isFinite(w+h)||w<=0||h<=0)errors.push("invalid-job-size");
 const ids=new Set<string>();
 for(const o of objects){
  if(ids.has(o.id))errors.push("duplicate-source-id:"+o.id);ids.add(o.id);
  const path=pts(o);
  if(path.length<2||path.some(p=>!Number.isFinite(p.x+p.y)))errors.push("invalid-path:"+o.id);
  if(path.some(p=>p.x<0||p.y<0||p.x>w||p.y>h))errors.push("outside-job-envelope:"+o.id);
  if(o.kind==="satin"&&(!Number.isFinite(o.width)||o.width<.7||o.width>8))errors.push("unsafe-satin-width:"+o.id);
 }
 return errors;
}
export function planEmbroideryJob(objects:readonly StitchIrObject[],opts:{widthMm:number;heightMm:number;trimJumpMm?:number}):ManufacturingJobPlan{
 const {widthMm,heightMm}=opts,trimJumpMm=opts.trimJumpMm??7;
 const errors=geometryErrors(objects,widthMm,heightMm);
 const operations:ManufacturingOperation[]=[];
 let previous:StitchIrObject|undefined;
 for(const o of objects){
  const last=previous;
  if(last){
   if(o.color!==last.color)operations.push({kind:"color-change",id:"color:"+o.id,from:last.color,to:o.color});
   const a=pts(last).at(-1),b=pts(o)[0];
   if(a&&b&&Number.isFinite(d(a,b))&&d(a,b)>1e-8){
    const distanceMm=d(a,b);
    if(distanceMm>trimJumpMm)operations.push({kind:"trim",id:"trim:"+o.id,reason:"long-jump"});
    operations.push({kind:"jump",id:"jump:"+o.id,from:a,to:b,distanceMm});
   }
  }
  operations.push({kind:"stitch",id:"stitch:"+o.id,sourceId:o.id,stitchType:o.kind,color:o.color});
  previous=o;
 }
 const m=routingMetrics(objects);
 return {schema:"ascend.manufacturing.job.v1",process:"embroidery",widthMm,heightMm,operations,sourceObjectIds:objects.map(o=>o.id),metrics:{travelMm:m.travelMm,colorChanges:m.colorChanges,longJumps:operations.filter(o=>o.kind==="trim").length,operationCount:operations.length},validation:{valid:errors.length===0,errors,warnings:["Reference plan only: material calibration, machine-specific postprocessing and sew-out are required."]}};
}
export function planWeavingJob(objects:readonly StitchIrObject[],opts:{widthMm:number;heightMm:number;endsPerCm:number;picksPerCm:number;maxShafts?:number;maxTreadles?:number}):ManufacturingJobPlan{
 const errors=geometryErrors(objects,opts.widthMm,opts.heightMm);
 const loom=compileLoomPlan(objects,opts);
 const draft=liftPlanToShaftDraft(loom,opts.maxShafts??16,opts.maxTreadles??32);
 errors.push(...loom.errors,...draft.errors);
 const operations:ManufacturingOperation[]=loom.liftRows.map((lifts,row)=>({kind:"loom-pick",id:"pick:"+row,row,lifts}));
 return {schema:"ascend.manufacturing.job.v1",process:"weaving",widthMm:opts.widthMm,heightMm:opts.heightMm,operations,sourceObjectIds:objects.map(o=>o.id),metrics:{travelMm:0,colorChanges:0,longJumps:0,operationCount:operations.length},validation:{valid:errors.length===0,errors,warnings:["Draft is not a loom-specific control file. Verify yarn, sett, tie-up capacity and physical sample."]},loom:{liftPlan:loom,shaftDraft:draft}};
}
