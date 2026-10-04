import type {GarmentConfiguration,GarmentZone} from "./garment";
import type {ContinuitySegment} from "./continuity-registration";
import type {ZoneProjection} from "./batch";

export type TrajectoryPoint={zoneId:string;x01:number;y01:number;role:"entry"|"control"|"exit"};
export type GarmentTrajectory={
 id:string;relation:string;zones:string[];points:TrajectoryPoint[];
 closed:boolean;manufacturable:boolean;
};

function center(z:GarmentZone,role:TrajectoryPoint["role"],x01=.5):TrajectoryPoint{
 return {zoneId:z.id,x01, y01:role==="entry"?.08:role==="exit"?.92:.5,role};
}

export function buildGarmentTrajectories(
 garment:GarmentConfiguration,
 registration:ContinuitySegment[]
):GarmentTrajectory[]{
 const zones=new Map(garment.zones.map(z=>[z.id,z]));
 const usable=registration.filter(r=>r.manufacturable);
 const outgoing=new Map<string,ContinuitySegment[]>();
 for(const r of usable){const a=outgoing.get(r.fromZoneId)??[];a.push(r);outgoing.set(r.fromZoneId,a);}
 const incoming=new Set(usable.map(r=>r.toZoneId));
 const starts=[...new Set(usable.map(r=>r.fromZoneId))].filter(id=>!incoming.has(id));
 const seen=new Set<string>(),result:GarmentTrajectory[]=[];
 for(const start of starts){
  let current=start;const chain:ContinuitySegment[]=[];const local=new Set<string>();
  while(!local.has(current)){local.add(current);const next=(outgoing.get(current)??[]).find(x=>!seen.has(x.id));if(!next)break;seen.add(next.id);chain.push(next);current=next.toZoneId;}
  if(!chain.length)continue;
  const zoneIds=[chain[0]!.fromZoneId,...chain.map(x=>x.toZoneId)];
  const points:TrajectoryPoint[]=[];
  zoneIds.forEach((id,i)=>{const z=zones.get(id);if(!z)return;const x=.5+((i%2?1:-1)*Math.min(.22,.04*i));points.push(center(z,i===0?"entry":i===zoneIds.length-1?"exit":"control",x));});
  result.push({id:`trajectory:${result.length}`,relation:chain.map(x=>x.relation).join(">"),zones:zoneIds,points,closed:chain[chain.length-1]!.toZoneId===start,manufacturable:true});
 }
 for(const r of usable.filter(x=>!seen.has(x.id))){
  const a=zones.get(r.fromZoneId),b=zones.get(r.toZoneId);if(!a||!b)continue;
  result.push({id:`trajectory:${result.length}`,relation:r.relation,zones:[a.id,b.id],points:[center(a,"entry"),center(a,"exit",r.from.position01),center(b,"entry",r.to.position01),center(b,"exit")],closed:false,manufacturable:true});
 }
 return result;
}

export function injectTrajectoryMetadata(projections:ZoneProjection[],trajectories:GarmentTrajectory[]):ZoneProjection[]{
 return projections.map(p=>{
  const refs=trajectories.filter(t=>t.zones.includes(p.zoneId));
  if(!refs.length)return p;
  const metadata=`<metadata data-ascend-trajectories="${refs.map(r=>r.id).join(",")}" data-trajectory-count="${refs.length}"/>`;
  return {...p,svg:{...p.svg,svg:p.svg.svg.replace(">",`>${metadata}`)}};
 });
}
