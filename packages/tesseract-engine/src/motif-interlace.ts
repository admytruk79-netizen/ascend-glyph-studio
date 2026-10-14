import {assertMotifGraph,transformMotifPoint,type MotifGraph} from './motif-graph';
import {segmentDistance} from './motif-clearance';
import type {StitchIrPoint as Point} from './production-stitch-ir';

export type ObservedCrossing={id:string;over:string;under:string;at:Point;toleranceMm:number;evidence:string};
export type CrossingCandidate={a:string;b:string;at:Point;aPath:number;aSegment:number;bPath:number;bSegment:number};
/** A reference-only sidecar. Crossings are not junctions and never exempt
 * overlapping geometry from the existing manufacturing clearance gate. */
export function analyseMotifInterlace(graph:MotifGraph,observed:ObservedCrossing[]=[]){
 assertMotifGraph(graph);
 const elements=graph.nodes.filter(n=>n.kind==='element').map(n=>({id:n.id,
  paths:n.geometry!.paths.map(path=>path.map(p=>transformMotifPoint(graph,n.id,p)))}));
 const segmentCount=elements.reduce((s,e)=>s+e.paths.reduce((n,p)=>n+p.length-1,0),0);
 if(segmentCount>2000)throw new Error('motif-interlace:segment-budget');
 const candidates:CrossingCandidate[]=[],ambiguous:{a:string;b:string;reason:string}[]=[];
 const cross=(x:Point,y:Point)=>x.x*y.y-x.y*y.x;
 for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
  const a=elements[i],b=elements[j];
  a.paths.forEach((ap,ai)=>b.paths.forEach((bp,bi)=>{
   for(let u=0;u<ap.length-1;u++)for(let v=0;v<bp.length-1;v++){
    const p=ap[u],q=bp[v],r={x:ap[u+1].x-p.x,y:ap[u+1].y-p.y},s={x:bp[v+1].x-q.x,y:bp[v+1].y-q.y};
    const den=cross(r,s),offset={x:q.x-p.x,y:q.y-p.y};
    if(Math.abs(den)<=1e-12*Math.max(1,Math.hypot(r.x,r.y)*Math.hypot(s.x,s.y))){
     if(segmentDistance([p,ap[u+1]],[q,bp[v+1]])<=1e-9)ambiguous.push({a:a.id,b:b.id,reason:'parallel-contact-or-collinear-overlap'});
     continue;
    }
    const t=cross(offset,s)/den,w=cross(offset,r)/den;
    if(t<0||t>1||w<0||w>1)continue;
    if(t<=1e-9||t>=1-1e-9||w<=1e-9||w>=1-1e-9){ambiguous.push({a:a.id,b:b.id,reason:'endpoint-or-polyline-vertex-contact'});continue;}
    candidates.push({a:a.id,b:b.id,at:{x:p.x+t*r.x,y:p.y+t*r.y},aPath:ai,aSegment:u,bPath:bi,bSegment:v});
   }
  }));
 }
 const ids=new Set<string>(),matched=new Set<number>();
 const crossings=observed.map(o=>{
  if(!o.id||ids.has(o.id)||!o.evidence?.trim()||o.over===o.under||!Number.isFinite(o.at.x)||!Number.isFinite(o.at.y)
   ||!Number.isFinite(o.toleranceMm)||o.toleranceMm<0)throw new Error('motif-interlace:invalid-observation');
  ids.add(o.id);
  const found=candidates.map((c,i)=>({c,i})).filter(({c})=>[c.a,c.b].includes(o.over)&&[c.a,c.b].includes(o.under)
   &&Math.hypot(c.at.x-o.at.x,c.at.y-o.at.y)<=o.toleranceMm+1e-9);
  if(found.length!==1||matched.has(found[0].i))throw new Error('motif-interlace:unsupported-or-ambiguous-crossing');
  matched.add(found[0].i);
  return {...found[0].c,id:o.id,over:o.over,under:o.under,evidence:o.evidence};
 });
 return {schema:'ascend.motif-interlace-analysis.v1' as const,state:'REFERENCE' as const,
  candidates,crossings,unresolved:candidates.filter((_,i)=>!matched.has(i)),ambiguous,
  junctionsAdded:0,physicalCalibration:null,stitchCount:null,productionApproved:false as const,
  limitations:['Only crossings between different element polylines are analysed; self-crossings need separate annotations.',
   'Endpoint, vertex and collinear contacts remain ambiguous; no over/under order is inferred.',
   'Observed under-strand continuation through an image interruption is a manual hypothesis, not a visible contour.',
   'Topology sidecar does not suppress clearance violations or establish a sew-out sequence.']};
}
