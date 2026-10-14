import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifProvenance} from './motif-graph';
import {components} from './raster-features';
import type {StitchIrPoint as Point} from './production-stitch-ir';
type Edge={a:Point;b:Point;direction:number};
const key=(p:Point)=>`${p.x},${p.y}`;
/** Exact cell-boundary tracing of a reviewed binary mask. Four-connectivity,
 * right-turn tie breaking and signed loop areas preserve holes and diagonal gaps.
 * Pixel contours are reference geometry, not semantic motifs or machine stitches. */
export function graphFromMotifMaskContours(mask:Uint8Array,width:number,height:number,
 provenance:MotifProvenance,referenceWidthMm=100){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144
  ||mask.length!==width*height||mask.some(p=>p!==0&&p!==1))throw new Error('motif-contours:binary-mask');
 const pitch=referenceWidthMm/width;
 if(!Number.isFinite(referenceWidthMm)||referenceWidthMm<=0||pitch===0||!Number.isFinite(pitch*height))throw new Error('motif-contours:scale');
 const source=structuredClone(provenance);
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:'mask-cell-contours-v1',
  widthMm:referenceWidthMm,heightMm:height*pitch,minGapMm:0,provenance:[source],relations:[],negativeSpace:[],nodes:[
   {id:'composition',kind:'composition',provenanceId:source.id,confidence:source.confidence,evidence:['binary-mask cell boundaries'],transform:identityMotifTransform()},
   {id:'field',kind:'region',parentId:'composition',provenanceId:source.id,confidence:source.confidence,evidence:['explicit raster field'],transform:identityMotifTransform()}]};
 assertMotifGraph(graph);
 let holeCount=0,loopCount=0;
 const groups=components(mask,width,height,0,1);
 groups.forEach((pixels,index)=>{
  const edges:Edge[]=[];
  for(const p of pixels){const x=p%width,y=Math.floor(p/width);
   if(y===0||!mask[p-width])edges.push({a:{x,y},b:{x:x+1,y},direction:0});
   if(x===width-1||!mask[p+1])edges.push({a:{x:x+1,y},b:{x:x+1,y:y+1},direction:1});
   if(y===height-1||!mask[p+width])edges.push({a:{x:x+1,y:y+1},b:{x,y:y+1},direction:2});
   if(x===0||!mask[p-1])edges.push({a:{x,y:y+1},b:{x,y},direction:3});
  }
  const outgoing=new Map<string,number[]>();edges.forEach((e,i)=>outgoing.set(key(e.a),[...(outgoing.get(key(e.a))??[]),i]));
  const used=new Set<number>(),paths:Point[][]=[];
  for(let start=0;start<edges.length;start++){
   if(used.has(start))continue;
   const path=[edges[start].a];let current=start;
   while(true){
    if(used.has(current))throw new Error('motif-contours:edge-reuse');
    used.add(current);const e=edges[current];path.push(e.b);
    if(key(e.b)===key(path[0]))break;
    const candidates=(outgoing.get(key(e.b))??[]).filter(i=>!used.has(i));
    const priority=[(e.direction+1)%4,e.direction,(e.direction+3)%4,(e.direction+2)%4];
    candidates.sort((a,b)=>priority.indexOf(edges[a].direction)-priority.indexOf(edges[b].direction));
    if(!candidates.length)throw new Error('motif-contours:open-loop');current=candidates[0];
   }
   // Remove only collinear cell-edge vertices, including the loop seam.
   const ring=path.slice(0,-1),corners=ring.filter((p,i)=>{
    const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];
    return (p.x-a.x)*(b.y-p.y)-(p.y-a.y)*(b.x-p.x)!==0;
   });
   const area=ring.reduce((n,p,i)=>{const q=ring[(i+1)%ring.length];return n+p.x*q.y-q.x*p.y;},0)/2;
   if(area<0)holeCount++;loopCount++;
   paths.push([...corners,corners[0]].map(p=>({x:p.x*pitch,y:p.y*pitch})));
  }
  const base={provenanceId:source.id,confidence:source.confidence,evidence:['exact binary-mask contours; no semantic classification'],transform:identityMotifTransform()};
  graph.nodes.push({...structuredClone(base),id:`component-${index}`,kind:'assembly',parentId:'field'},
   {...structuredClone(base),id:`contours-${index}`,kind:'element',parentId:`component-${index}`,geometry:{namespace:'reference',paths,ports:{}}});
 });
 source.transformations.push({operation:'binary mask cell-boundary contours',evidence:`${width}x${height}; ${pitch} reference mm/pixel; four-connectivity; holes retained; not physical calibration`});
 assertMotifGraph(graph);
 return {graph,componentCount:groups.length,loopCount,holeCount,pixelPitchMm:pitch};
}
