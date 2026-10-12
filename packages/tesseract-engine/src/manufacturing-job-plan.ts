import type {MachineTemplate} from "./machine-template";
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
 validation:{valid:boolean;errors:string[];warnings:string[];productionApproved:false};
 loom?:{liftPlan:LoomPlan;shaftDraft:ShaftDraft};
};
const pts=(o:StitchIrObject):StitchIrPoint[]=>o.kind==="fill"?o.polygon:o.path;
const d=(a:StitchIrPoint,b:StitchIrPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function geometryErrors(objects:readonly StitchIrObject[],w:number,h:number){
 const errors:string[]=[];
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)errors.push("invalid-job-size");
 const ids=new Set<string>();
 for(const o of objects){
  if(ids.has(o.id))errors.push("duplicate-source-id:"+o.id);ids.add(o.id);
  const path=pts(o);
  if(path.length<2||path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))errors.push("invalid-path:"+o.id);
  if(path.some(p=>p.x<0||p.y<0||p.x>w||p.y>h))errors.push("outside-job-envelope:"+o.id);
  if(o.kind==="satin"&&(!Number.isFinite(o.width)||o.width<.7||o.width>8))errors.push("unsafe-satin-width:"+o.id);
 }
 return errors;
}
/**
 * Reference machine limits are a rejection gate, not a physical approval.
 * The caller must explicitly plan any re-hooping, rotation or registration.
 */
function machineErrors(objects:readonly StitchIrObject[],widthMm:number,heightMm:number,m:MachineTemplate):string[]{
 const errors:string[]=[];
 if(m.fieldX.unit!=="mm"||m.fieldY.unit!=="mm"||
    !Number.isFinite(m.fieldX.value)||!Number.isFinite(m.fieldY.value)||
    m.fieldX.value<=0||m.fieldY.value<=0){
  errors.push("machine-field-unverified");
 }else if(widthMm>m.fieldX.value||heightMm>m.fieldY.value){
  errors.push("machine-field-exceeded:segmentation-required");
 }
 if(!Number.isInteger(m.heads)||m.heads<1||
    !Number.isInteger(m.needlesPerHead)||m.needlesPerHead<1||
    !Number.isInteger(m.maxColors)||m.maxColors<1){
  errors.push("machine-color-capacity-unverified");
 }else if(new Set(objects.map(o=>o.color)).size>Math.min(m.maxColors,m.needlesPerHead)){
  errors.push("machine-color-capacity-exceeded");
 }
 if(!m.acceptedFormats.length)errors.push("machine-format-unverified");
 if(!Number.isFinite(m.registrationToleranceMm)||m.registrationToleranceMm<=0)
  errors.push("machine-registration-unverified");
 return errors;
}
export function planEmbroideryJob(objects:readonly StitchIrObject[],opts:{widthMm:number;heightMm:number;trimJumpMm?:number;machine?:MachineTemplate}):ManufacturingJobPlan{
 const {widthMm,heightMm}=opts,trimJumpMm=opts.trimJumpMm??7;
 const errors=geometryErrors(objects,widthMm,heightMm);
 if(!objects.length)errors.push("empty-embroidery-job");
 if(!Number.isFinite(trimJumpMm)||trimJumpMm<0)errors.push("invalid-trim-threshold");
 if(opts.machine)errors.push(...machineErrors(objects,widthMm,heightMm,opts.machine));
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
 return {schema:"ascend.manufacturing.job.v1",process:"embroidery",widthMm,heightMm,operations,sourceObjectIds:objects.map(o=>o.id),metrics:{travelMm:m.travelMm,colorChanges:m.colorChanges,longJumps:operations.filter(o=>o.kind==="trim").length,operationCount:operations.length},validation:{valid:errors.length===0,errors,warnings:[
  "Reference plan only: material calibration, machine-specific postprocessing and sew-out are required.",
  ...(opts.machine?["Selected machine "+opts.machine.id+" is "+opts.machine.confidence+"; no physical approval inferred."]:["No machine selected; machine feasibility unverified."])
 ],productionApproved:false}};
}
export function planWeavingJob(objects:readonly StitchIrObject[],opts:{widthMm:number;heightMm:number;endsPerCm:number;picksPerCm:number;maxShafts?:number;maxTreadles?:number}):ManufacturingJobPlan{
 const errors=geometryErrors(objects,opts.widthMm,opts.heightMm);
 const loom=compileLoomPlan(objects,opts);
 const draft=liftPlanToShaftDraft(loom,opts.maxShafts??16,opts.maxTreadles??32);
 errors.push(...loom.errors,...draft.errors);
 const operations:ManufacturingOperation[]=loom.liftRows.map((lifts,row)=>({kind:"loom-pick",id:"pick:"+row,row,lifts}));
 return {schema:"ascend.manufacturing.job.v1",process:"weaving",widthMm:opts.widthMm,heightMm:opts.heightMm,operations,sourceObjectIds:objects.map(o=>o.id),metrics:{travelMm:0,colorChanges:0,longJumps:0,operationCount:operations.length},validation:{valid:errors.length===0,errors,warnings:["Draft is not a loom-specific control file. Verify yarn, sett, tie-up capacity and physical sample."],productionApproved:false},loom:{liftPlan:loom,shaftDraft:draft}};
}
