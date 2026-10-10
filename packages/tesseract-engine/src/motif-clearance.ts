import {assertMotifGraph,transformMotifPoint,type MotifGraph} from './motif-graph';
import type {StitchIrPoint as Point} from './production-stitch-ir';

type Segment=[Point,Point];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const interpolate=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function pointSegmentDistance(p:Point,[a,b]:Segment){
 const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy;
 const t=length2===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length2));
 return distance(p,interpolate(a,b,t));
}
function segmentDistance(a:Segment,b:Segment){
 const r={x:a[1].x-a[0].x,y:a[1].y-a[0].y},s={x:b[1].x-b[0].x,y:b[1].y-b[0].y};
 const cross=(p:Point,q:Point)=>p.x*q.y-p.y*q.x;
 const determinant=cross(r,s),offset={x:b[0].x-a[0].x,y:b[0].y-a[0].y};
 if(determinant!==0){const t=cross(offset,s)/determinant,u=cross(offset,r)/determinant;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 return Math.min(pointSegmentDistance(a[0],b),pointSegmentDistance(a[1],b),pointSegmentDistance(b[0],a),pointSegmentDistance(b[1],a));
}
/** Remove only a bounded junction neighbourhood. Never exempt an entire connected pair. */
function outsideJunction([a,b]:Segment,center:Point,radius:number):Segment[]{
 const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-center.x,oy=a.y-center.y;
 const A=dx*dx+dy*dy,B=2*(ox*dx+oy*dy),C=ox*ox+oy*oy-radius*radius;
 if(A===0)return distance(a,center)>=radius?[[a,b]]:[];
 const discriminant=B*B-4*A*C;
 const cuts=[0,1];
 if(discriminant>0)for(const t of [(-B-Math.sqrt(discriminant))/(2*A),(-B+Math.sqrt(discriminant))/(2*A)])if(t>0&&t<1)cuts.push(t);
 cuts.sort((x,y)=>x-y);
 return cuts.slice(1).flatMap((hi,i)=>distance(interpolate(a,b,(hi+cuts[i])/2),center)>=radius-1e-9?[[interpolate(a,b,cuts[i]),interpolate(a,b,hi)] as Segment]:[]);
}

/** Observed polylines: centreline clearance only, not thread width, fills or fabric validation. */
export function measureMotifClearance(graph:MotifGraph){
 assertMotifGraph(graph);
 const elements=graph.nodes.filter(n=>n.kind==='element').map(n=>{
  const paths=n.geometry!.paths.map(path=>path.map(p=>transformMotifPoint(graph,n.id,p)));
  const segments=paths.flatMap(path=>path.slice(1).map((p,i)=>[path[i],p] as Segment));
  return {id:n.id,segments,points:paths.flat()};
 });
 const byId=new Map(elements.map(e=>[e.id,e]));
 const joins: {from:string;to:string;fromPoint:Point;toPoint:Point}[]=[];
 const portsOffPath:string[]=[];
 for(const r of graph.relations)if(r.kind==='junction'){
  const from=graph.nodes.find(n=>n.id===r.from)!,to=graph.nodes.find(n=>n.id===r.to)!;
  const a=transformMotifPoint(graph,from.id,from.geometry!.ports[r.fromPort]),b=transformMotifPoint(graph,to.id,to.geometry!.ports[r.toPort]);
  const onPath=(id:string,p:Point)=>byId.get(id)!.segments.some(s=>pointSegmentDistance(p,s)<=1e-6);
  const aOn=onPath(from.id,a),bOn=onPath(to.id,b);
  if(!aOn)portsOffPath.push(`${from.id}:${r.fromPort}`);if(!bOn)portsOffPath.push(`${to.id}:${r.toPort}`);
  if(aOn&&bOn&&distance(a,b)<=r.toleranceMm)joins.push({from:r.from,to:r.to,fromPoint:a,toPoint:b});
 }
 let minimum=Infinity;
 const junctionExclusionRadiusMm=Math.max(graph.minGapMm,1e-6);
 const violations:{from:string;to:string;centerlineGapMm:number}[]=[];
 for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
  const a=elements[i],b=elements[j];let left=a.segments,right=b.segments;
  for(const join of joins){
   const forward=join.from===a.id&&join.to===b.id,reverse=join.from===b.id&&join.to===a.id;
   if(!forward&&!reverse)continue;
   left=left.flatMap(s=>outsideJunction(s,forward?join.fromPoint:join.toPoint,junctionExclusionRadiusMm));
   right=right.flatMap(s=>outsideJunction(s,forward?join.toPoint:join.fromPoint,junctionExclusionRadiusMm));
  }
  let gap=Infinity;
  for(const s of left)for(const t of right)gap=Math.min(gap,segmentDistance(s,t));
  minimum=Math.min(minimum,gap);
  if(gap<graph.minGapMm-1e-9||gap===0)violations.push({from:a.id,to:b.id,centerlineGapMm:gap});
 }
 const outsideEnvelope=elements.filter(e=>e.points.some(p=>p.x<0||p.y<0||p.x>graph.widthMm||p.y>graph.heightMm)).map(e=>e.id);
 return {basis:'observed-polyline-centrelines' as const,minimumCenterlineGapMm:Number.isFinite(minimum)?minimum:null,
  junctionExclusionRadiusMm,clearanceViolations:violations,portsOffPath:[...new Set(portsOffPath)],outsideEnvelope};
}
