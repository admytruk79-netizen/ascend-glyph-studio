/** Rotated rectangular production envelopes using SAT collision tests.
 * Inspired by geometry-aware placement used by public nesting solvers such as
 * libnest2d (https://github.com/tamasmeszaros/libnest2d).
 * This is original TypeScript, no external source copied.
 */
export type RectPose={x:number;y:number;width:number;height:number;angleDeg:number};
export function rotatedExtents(p:RectPose){
 const a=p.angleDeg*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 return {x:(p.width*c+p.height*s)/2,y:(p.width*s+p.height*c)/2};
}
export function insideZone(p:RectPose,width:number,height:number,gap=0,wrap=false){
 const e=rotatedExtents(p);
 return p.y-e.y-gap>=-1e-8&&p.y+e.y+gap<=height+1e-8&&(wrap||p.x-e.x-gap>=-1e-8&&p.x+e.x+gap<=width+1e-8);
}
function axes(p:RectPose){
 const a=p.angleDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [{x:c,y:s},{x:-s,y:c}];
}
function radiusOn(p:RectPose,axis:{x:number;y:number}){
 const [u,v]=axes(p);
 return (Math.abs(u!.x*axis.x+u!.y*axis.y)*p.width+Math.abs(v!.x*axis.x+v!.y*axis.y)*p.height)/2;
}
/** Positive result means the padded oriented envelopes overlap. */
export function overlapsRotated(a:RectPose,b:RectPose,gap=0,period?:number):boolean{
 const dx=period&&period>0?(b.x-a.x)-Math.round((b.x-a.x)/period)*period:b.x-a.x;
 const dy=b.y-a.y;
 for(const axis of [...axes(a),...axes(b)]){
  const separation=Math.abs(dx*axis.x+dy*axis.y);
  if(separation>=radiusOn(a,axis)+radiusOn(b,axis)+gap-1e-8)return false;
 }
 return true;
}
/** Check that all four corners of the child are inside the rotated parent with clearance. */
export function nestedRotated(parent:RectPose,child:RectPose,gap=0,period?:number){
 const [u,v]=axes(parent);
 const theta=child.angleDeg*Math.PI/180,cu=Math.cos(theta),su=Math.sin(theta);
 const dx=period&&period>0?(child.x-parent.x)-Math.round((child.x-parent.x)/period)*period:child.x-parent.x,dy=child.y-parent.y;
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const x=dx+sx*child.width/2*cu-sy*child.height/2*su;
  const y=dy+sx*child.width/2*su+sy*child.height/2*cu;
  if(Math.abs(x*u!.x+y*u!.y)+gap>parent.width/2+1e-8)return false;
  if(Math.abs(x*v!.x+y*v!.y)+gap>parent.height/2+1e-8)return false;
 }
 return true;
}
