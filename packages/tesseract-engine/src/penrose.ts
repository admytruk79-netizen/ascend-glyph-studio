import type {StitchIrPoint as Point} from './production-stitch-ir';
export const GOLDEN_RATIO=(1+Math.sqrt(5))/2;
export type RobinsonTriangle={type:0|1;a:Point;b:Point;c:Point};
const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
/** Finite ten-triangle sun patch, refined by Robinson half-tile substitution.
 * Triangles are half-tiles, not a claim to a fully verified rhomb matching-rule tiling.
 */
export function penroseSun(depth:number,rotation=0):RobinsonTriangle[]{
 if(!Number.isInteger(depth)||depth<0||depth>6||!Number.isFinite(rotation))throw Error('Invalid Penrose refinement');
 let triangles:RobinsonTriangle[]=Array.from({length:10},(_,i)=>{
  const p=(angle:number)=>({x:Math.cos(angle+rotation),y:Math.sin(angle+rotation)});
  let b=p((2*i-1)*Math.PI/10),c=p((2*i+1)*Math.PI/10);if(i%2===0)[b,c]=[c,b];
  return{type:0,a:{x:0,y:0},b,c};
 });
 for(let step=0;step<depth;step++)triangles=triangles.flatMap(t=>{
  if(t.type===0){const p=mix(t.a,t.b,1/GOLDEN_RATIO);return[{type:0,a:t.c,b:p,c:t.b},{type:1,a:p,b:t.c,c:t.a}] as RobinsonTriangle[];}
  const q=mix(t.b,t.a,1/GOLDEN_RATIO),r=mix(t.b,t.c,1/GOLDEN_RATIO);
  return[{type:1,a:r,b:t.c,c:t.a},{type:1,a:q,b:r,c:t.b},{type:0,a:r,b:q,c:t.a}] as RobinsonTriangle[];
 });
 return triangles;
}
