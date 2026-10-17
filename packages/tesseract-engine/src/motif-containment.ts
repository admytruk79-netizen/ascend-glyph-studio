import {pointSegmentDistance,segmentDistance} from './motif-clearance';
import type {StitchIrPoint as Point} from './production-stitch-ir';
/** Conservative containment evidence: one simple closed outer contour, no holes.
 * Reject ambiguous multi-outline parents, touching/crossing edges and self crossings.
 * This establishes spatial containment only, not semantic or stitch connectivity. */
export function assertObservedContainment(parent:Point[][],child:Point[][]):void{
 const fail=():never=>{throw new Error('motif-observed:unsupported-containment');};
 if(parent.length!==1)fail();
 const contour=parent[0]!;
 if(contour.length<4||contour[0]!.x!==contour.at(-1)!.x||contour[0]!.y!==contour.at(-1)!.y)fail();
 const edges=contour.slice(1).map((p,i)=>[contour[i]!,p] as [Point,Point]);
 if(edges.some(([a,b])=>Math.hypot(a.x-b.x,a.y-b.y)<1e-9))fail();
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  if(j===i+1||i===0&&j===edges.length-1)continue;
  if(segmentDistance(edges[i]!,edges[j]!)<1e-9)fail();
 }
 const inside=(p:Point)=>{
  if(edges.some(e=>pointSegmentDistance(p,e)<1e-9))return false;
  let contained=false;
  for(const [a,b] of edges)if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)contained=!contained;
  return contained;
 };
 if(!child.length)fail();
 for(const path of child){
  if(path.length<2||!path.every(inside))fail();
  // Vertex-only tests miss straight segments escaping concave outer contours.
  for(let i=1;i<path.length;i++)if(edges.some(edge=>segmentDistance([path[i-1]!,path[i]!],edge)<1e-9))fail();
 }
}
