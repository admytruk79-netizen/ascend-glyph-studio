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
