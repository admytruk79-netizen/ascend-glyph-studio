export type WrapPoint={u:number;v:number};export type SurfacePoint={x:number;y:number;z:number};
export function taperedCircumference(t:number,start:number,end:number){return start+(end-start)*Math.max(0,Math.min(1,t))}
export function wrapTaperedCylinder(p:WrapPoint,length:number,cStart:number,cEnd:number):SurfacePoint{
 const t=Math.max(0,Math.min(1,p.v)),c=taperedCircumference(t,cStart,cEnd),r=c/(2*Math.PI),theta=p.u*2*Math.PI;
 return {x:r*Math.cos(theta),y:t*length,z:r*Math.sin(theta)};
}
export function seamDistance(u:number){const x=((u%1)+1)%1;return Math.min(x,1-x)}
