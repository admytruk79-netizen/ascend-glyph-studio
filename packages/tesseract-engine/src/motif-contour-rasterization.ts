import {assertMotifGraph,transformMotifPoint,type MotifGraph} from './motif-graph';
/** Reference-only even/odd polygon rasterization at pixel centres.
 * Separate elements are combined by union; holes are local to each element.
 * Not a manufacturing fill planner. */
export function rasterizeObservedContours(graph:MotifGraph,width:number,height:number):Uint8Array{
 assertMotifGraph(graph);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144)
  throw new Error('motif-contour-rasterization:dimensions');
 const elements=graph.nodes.filter(n=>n.geometry).map(n=>n.geometry!.paths.map(path=>{
  if(path.length<4||path[0].x!==path.at(-1)!.x||path[0].y!==path.at(-1)!.y)throw new Error('motif-contour-rasterization:open-contour');
  return path.map(p=>transformMotifPoint(graph,n.id,p));
 }));
 const mask=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=(x+.5)*graph.widthMm/width,py=(y+.5)*graph.heightMm/height;
  mask[y*width+x]=elements.some(paths=>{
   let inside=false;
   for(const path of paths)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    if((a.y>py)!==(b.y>py)&&px<(b.x-a.x)*(py-a.y)/(b.y-a.y)+a.x)inside=!inside;
   }
   return inside;
  })?1:0;
 }
 return mask;
}
