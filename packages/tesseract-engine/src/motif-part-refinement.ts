import {assertMotifGraph} from './motif-graph';
import type {MotifPartLibrary} from './motif-part-composer';
type Point={x:number;y:number};
const area=(p:Point[])=>Math.abs(p.slice(1).reduce((n,b,i)=>n+p[i]!.x*b.y-b.x*p[i]!.y,0)/2);
/** Reference-only contour cleanup. This changes source geometry; raw library and originals remain untouched. */
export function refineMotifPartLibrary(input:MotifPartLibrary){
 const library=structuredClone(input);let removedLoops=0,beforePoints=0,afterPoints=0;
 for(const piece of library.pieces){
  for(const layer of piece.layers){
   for(const node of layer.graph.nodes){if(!node.geometry)continue;const paths=node.geometry.paths;beforePoints+=paths.reduce((n,p)=>n+p.length,0);
    const largest=Math.max(...paths.map(area)),keep=paths.filter(p=>area(p)>=Math.min(24,largest));removedLoops+=paths.length-keep.length;
    node.geometry.paths=keep.map(path=>{let ring=path.slice(0,-1).map(p=>({...p}));
     for(let pass=0;pass<2;pass++){
      const next:Point[]=[];for(let i=0;i<ring.length;i++){const a=ring[i]!,b=ring[(i+1)%ring.length]!;next.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75});}ring=next;
     }
     // Retain one point per ~0.8 source pixel; smoothing adds no manufacturing approval.
     const sampled:Point[]=[];for(const p of ring)if(!sampled.length||Math.hypot(p.x-sampled.at(-1)!.x,p.y-sampled.at(-1)!.y)>=.8)sampled.push(p);
     const result=sampled.length>=3?sampled:ring;return [...result,{...result[0]!}];
    });afterPoints+=node.geometry.paths.reduce((n,p)=>n+p.length,0);
   }
   layer.graph.provenance.forEach(p=>p.transformations.push({operation:'draft contour refinement',evidence:'Drop loops under 24 source-pixel square area (retain largest per layer); two corner-cutting passes and approximately 0.8-pixel sampling. Changes contours and small holes; exact mask roundtrip no longer claimed.'}));assertMotifGraph(layer.graph);
  }
  if(piece.kind==='flower'||piece.kind==='leaf'){
   const cx=piece.width/2,cy=piece.height/2,bins=Array.from({length:96},()=>[] as number[]);
   for(const layer of piece.layers)for(const node of layer.graph.nodes)for(const path of node.geometry?.paths??[])for(const p of path){const a=(Math.atan2(p.y-cy,p.x-cx)+2*Math.PI)%(2*Math.PI),index=Math.floor(a/(2*Math.PI)*96)%96;bins[index]!.push(Math.hypot(p.x-cx,p.y-cy));}
   const radii=bins.map(v=>v.length?Math.max(...v):0);
   for(let i=0;i<96;i++)if(!radii[i]){let distance=1;while(distance<96&&!radii[(i+distance)%96]&&!radii[(i-distance+96)%96])distance++;radii[i]=radii[(i+distance)%96]||radii[(i-distance+96)%96]!;}
   const silhouette=radii.map((r,i)=>{const radius=(r*2+radii[(i+95)%96]!+radii[(i+1)%96]!)/4,a=i*2*Math.PI/96;return {x:Math.max(0,Math.min(piece.width,cx+radius*Math.cos(a))),y:Math.max(0,Math.min(piece.height,cy+radius*Math.sin(a)))};});silhouette.push({...silhouette[0]!});
   const dominant=[...piece.layers].sort((a,b)=>b.foregroundPixels-a.foregroundPixels)[0]!,graph=structuredClone(dominant.graph),element=graph.nodes.find(n=>n.geometry)!;
   graph.nodes=graph.nodes.filter(n=>!n.geometry||n.id===element.id);element.geometry!.paths=[silhouette];element.geometry!.ports={};
   graph.provenance.forEach(p=>p.transformations.push({operation:'authored silhouette backing',evidence:'Smoothed radial envelope of retained pigment contours in dominant layer colour; fills scan-paper voids. This changes holes and is an interpreted redraw, not an exact historical reconstruction.'}));
   piece.layers.unshift({color:piece.kind==='leaf'?'#332027':'#9d2437',graph,foregroundPixels:0});Object.values(piece.ports).forEach(p=>p.ownerId=`layer-${Number(p.ownerId.slice(6))+1}`);
  }
  for(const port of Object.values(piece.ports)){
   const layer=piece.layers[Number(port.ownerId.slice(6))]!;let best=Infinity,point=port.point;
   for(const path of layer.graph.nodes.flatMap(n=>n.geometry?.paths??[]))for(let i=1;i<path.length;i++){
    const a=path[i-1]!,b=path[i]!,dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((port.point.x-a.x)*dx+(port.point.y-a.y)*dy)/den)):0,p={x:a.x+t*dx,y:a.y+t*dy},d=Math.hypot(p.x-port.point.x,p.y-port.point.y);if(d<best){best=d;point=p;}
   }if(!Number.isFinite(best))throw Error('motif-refinement:no-port-owner');port.point={...point};
  }
  const palette:Record<string,string>={'#37392b':'#2a2024','#657248':'#9d2437','#a07452':'#b94855','#748786':'#ead4be','#c7b176':'#d38b86'};
  for(const layer of piece.layers){layer.color=piece.kind==='leaf'?'#332027':palette[layer.color]??layer.color;layer.graph.provenance.forEach(p=>p.transformations.push({operation:'contemporary red-black palette',evidence:JSON.stringify(palette)}));}
  piece.maskRoundtripExact=false;piece.segmentationReview+='; reference contour cleanup changes small loops/holes and boundary ports; original mask equality no longer applies';
 }
 return {library,report:{method:'draft-loop-filter-corner-cut-and-backed-silhouette-v1',removedLoops,beforePoints,afterPoints,maskRoundtripExact:false,productionApproved:false}};
}
