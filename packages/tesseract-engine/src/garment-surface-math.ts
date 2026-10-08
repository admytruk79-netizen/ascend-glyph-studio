import type {GarmentZone} from "./garment";

export type SurfacePoint3D={x:number;y:number;z:number};
export type SurfaceFootprint={id:string;u:number;v:number;widthMm:number;heightMm:number;rotationDeg?:number;clearanceMm?:number};

export function circumferenceAt(zone:GarmentZone,v:number):number{
 const H=Math.max(1,zone.heightMm??1);
 const c0=zone.circumferenceMm??zone.widthMm;
 if(!(c0&&c0>0))throw new Error("surface zone requires circumference or width");
 const c1=zone.circumferenceEndMm??c0;
 const t=Math.max(0,Math.min(1,v/H));
 return c0+(c1-c0)*t;
}

export function sleevePoint(zone:GarmentZone,u:number,v:number):SurfacePoint3D{
 const C=circumferenceAt(zone,v),r=C/(2*Math.PI),theta=2*Math.PI*(u/C);
 return {x:r*Math.cos(theta),y:r*Math.sin(theta),z:v};
}

export function zoneSurfaceArea(zone:GarmentZone):number{
 const H=Math.max(0,zone.heightMm??0);
 const c0=zone.circumferenceMm??zone.widthMm??0;
 const c1=zone.circumferenceEndMm??c0;
 if(!(H>0&&c0>0&&c1>0))return 0;
 const r0=c0/(2*Math.PI),r1=c1/(2*Math.PI);
 const slant=Math.hypot(H,r1-r0);
 return Math.PI*(r0+r1)*slant;
}

function periodicDelta(a:number,b:number,C:number):number{
 const d=Math.abs(a-b)%C;
 return Math.min(d,C-d);
}

export function wrappedCenterDistance(zone:GarmentZone,a:SurfaceFootprint,b:SurfaceFootprint):number{
 const C=circumferenceAt(zone,(a.v+b.v)/2);
 return Math.hypot(periodicDelta(a.u,b.u,C),a.v-b.v);
}


export type PairwiseJuxtaposition={a:string;b:string;centerDistanceMm:number;requiredClearanceMm:number;valid:boolean;overlapRisk:number};

export function assessSurfaceFootprint(zone:GarmentZone,f:SurfaceFootprint){
 const C=circumferenceAt(zone,f.v),r=C/(2*Math.PI),half=f.widthMm/2,A=zoneSurfaceArea(zone);
 const areaMm2=f.widthMm*f.heightMm;
 return {
  id:f.id,center:sleevePoint(zone,f.u,f.v),circumferenceMm:C,radiusMm:r,
  wrapAngleRad:f.widthMm/r,seamCrossing:f.u-half<0||f.u+half>C,
  areaMm2,occupancyFraction:A>0?areaMm2/A:0
 };
}

function halfExtents(f:SurfaceFootprint){
 const a=((f.rotationDeg??0)*Math.PI)/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 return {x:c*f.widthMm/2+s*f.heightMm/2,y:s*f.widthMm/2+c*f.heightMm/2};
}
export function juxtaposition(zone:GarmentZone,a:SurfaceFootprint,b:SurfaceFootprint):PairwiseJuxtaposition{
 const C=circumferenceAt(zone,(a.v+b.v)/2);
 const dx=periodicDelta(a.u,b.u,C),dy=Math.abs(a.v-b.v);
 const ea=halfExtents(a),eb=halfExtents(b),gap=Math.max(a.clearanceMm??0,b.clearanceMm??0);
 const reqX=ea.x+eb.x+gap,reqY=ea.y+eb.y+gap;
 // Two rectangles are clear if separated on either axis. This avoids treating a
 // long thin rail as a giant circular obstacle while remaining conservative for rotation.
 const valid=dx>=reqX||dy>=reqY;
 const overlapX=Math.max(0,reqX-dx)/(reqX||1),overlapY=Math.max(0,reqY-dy)/(reqY||1);
 const overlapRisk=valid?0:Math.max(0,Math.min(1,Math.min(overlapX,overlapY)));
 const d=Math.hypot(dx,dy),req=Math.hypot(reqX,reqY);
 return {a:a.id,b:b.id,centerDistanceMm:d,requiredClearanceMm:req,valid,overlapRisk};
}

export function evaluateSurfaceLayout(zone:GarmentZone,items:SurfaceFootprint[]){
 const area=zoneSurfaceArea(zone),assessments=items.map(x=>assessSurfaceFootprint(zone,x)),pairwise:PairwiseJuxtaposition[]=[];
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)pairwise.push(juxtaposition(zone,items[i]!,items[j]!));
 const used=assessments.reduce((s,x)=>s+x.areaMm2,0);
 return {
  surfaceAreaMm2:area,usedAreaMm2:used,nominalOccupancy:area>0?used/area:0,
  seamCrossings:assessments.filter(x=>x.seamCrossing).map(x=>x.id),
  invalidPairs:pairwise.filter(x=>!x.valid),pairwise
 };
}
