import{MultiscaleField,MicroMark,MesoPattern}from"./multiscale-floral";
export type ManufacturingMode="print"|"embroidery"|"digital";
export interface GeometryConstraints{widthMm:number;heightMm:number;minFeatureMm:number;maxDensity:number;mode:ManufacturingMode}
export interface ConstraintResult{field:MultiscaleField;requestedMicroCount:number;retainedMicroCount:number;effectiveDensity:number;minScale:number}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function applyGeometryConstraints(field:MultiscaleField,c:GeometryConstraints):ConstraintResult{
 const density=clamp(c.maxDensity,.08,1),minScale=clamp(c.minFeatureMm/Math.max(.01,Math.min(c.widthMm,c.heightMm))*100/2.2,.08,1);
 const stride=Math.max(1,Math.ceil(1/density));
 const meso:MesoPattern[]=field.meso.map((p,pi)=>({...p,marks:p.marks.filter((m,i)=>((i+pi)%stride===0)).map((m:MicroMark)=>({...m,scale:Number(Math.max(m.scale,minScale).toFixed(3))}))}));
 const retained=meso.reduce((n,p)=>n+p.marks.length,0);
 return{field:{...field,microCount:retained,meso},requestedMicroCount:field.microCount,retainedMicroCount:retained,effectiveDensity:Number((retained/Math.max(1,field.microCount)).toFixed(3)),minScale:Number(minScale.toFixed(3))};
}
