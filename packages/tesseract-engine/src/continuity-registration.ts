import type {GarmentConfiguration,GarmentZone} from "./garment";
import type {ContinuityEvent} from "./garment-continuity";

export type RegistrationPoint={zoneId:string;edge:"start"|"end"|"seam";position01:number;seamIndex?:number};
export type ContinuitySegment={
 id:string;fromZoneId:string;toZoneId:string;relation:string;
 seamPolicy:ContinuityEvent["seamPolicy"];
 from:RegistrationPoint;to:RegistrationPoint;
 manufacturable:boolean;reason?:string;
};

function seamPoint(z:GarmentZone,edge:"start"|"end"):RegistrationPoint{
 const seams=z.seamPositions??[];
 if(seams.length){
  const circumference=z.circumferenceMm??z.widthMm??1;
  const raw=edge==="end"?seams[seams.length-1]!:seams[0]!;
  return {zoneId:z.id,edge:"seam",position01:Math.max(0,Math.min(1,raw/circumference)),seamIndex:edge==="end"?seams.length-1:0};
 }
 return {zoneId:z.id,edge,position01:edge==="end"?1:0};
}

export function planContinuityRegistration(garment:GarmentConfiguration,events:ContinuityEvent[]):ContinuitySegment[]{
 const zones=new Map(garment.zones.map(z=>[z.id,z]));
 return events.map((e,i)=>{
  const a=zones.get(e.fromZoneId),b=zones.get(e.toZoneId);
  if(!a||!b)return {id:`continuity:${i}`,fromZoneId:e.fromZoneId,toZoneId:e.toZoneId,relation:e.relation,seamPolicy:e.seamPolicy,from:{zoneId:e.fromZoneId,edge:"end",position01:1},to:{zoneId:e.toZoneId,edge:"start",position01:0},manufacturable:false,reason:"zone-missing"};
  const from=seamPoint(a,"end"),to=seamPoint(b,"start");
  const crossing=e.seamPolicy==="cross";
  const allowed=!crossing||(a.wrapAllowed||a.surface==="flat"||a.surface==="compound")&&(b.wrapAllowed||b.surface==="flat"||b.surface==="compound");
  return {id:`continuity:${i}`,fromZoneId:a.id,toZoneId:b.id,relation:e.relation,seamPolicy:e.seamPolicy,from,to,manufacturable:allowed,reason:allowed?undefined:"cross-zone registration unsupported by one or both surfaces"};
 });
}
