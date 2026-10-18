import type {MotifGraph} from './motif-graph';
/** Scanline union at source pixel centres. Holes remain local to each element,
 * matching rasterizeObservedContours; source transforms must be identity. */
export function pigmentUnionMask(graphs:MotifGraph[],width:number,height:number){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144)throw Error('pigment-backing:dimensions');
 const mask=new Uint8Array(width*height);
 for(const graph of graphs)for(const node of graph.nodes){
  const t=node.transform;if(t.xMm||t.yMm||t.rotationDeg||t.scaleX!==1||t.scaleY!==1||t.reflectX)throw Error('pigment-backing:source-transform');
  if(!node.geometry)continue;
  for(let y=0;y<height;y++){
   const py=y+.5,xs:number[]=[];
   for(const path of node.geometry.paths)for(let i=1;i<path.length;i++){const a=path[i-1]!,b=path[i]!;if((a.y>py)!==(b.y>py))xs.push(a.x+(py-a.y)*(b.x-a.x)/(b.y-a.y));}
   xs.sort((a,b)=>a-b);
   for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,Math.ceil(xs[i]!-.5));x<Math.min(width,Math.ceil(xs[i+1]!-.5));x++)mask[y*width+x]=1;
  }
 }
 return mask;
}
/** Fill only bounded paper specks. Boundary-connected gaps and larger holes
 * are retained, rather than replaced by a radial/convex envelope. */
export function fillPigmentPinholes(mask:Uint8Array,width:number,height:number,maxHolePixels=24){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144||mask.length!==width*height||mask.some(v=>v!==0&&v!==1)||!Number.isInteger(maxHolePixels)||maxHolePixels<0)throw Error('pigment-backing:mask');
 const result=mask.slice(),seen=new Uint8Array(mask.length);let filledPixels=0,filledHoles=0;
 for(let start=0;start<mask.length;start++){
  if(mask[start]||seen[start])continue;
  const queue=[start];seen[start]=1;let boundary=false;
  for(let i=0;i<queue.length;i++){const p=queue[i]!,x=p%width,y=Math.floor(p/width);if(!x||!y||x===width-1||y===height-1)boundary=true;
   for(const q of [x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1])if(q>=0&&!mask[q]&&!seen[q]){seen[q]=1;queue.push(q);}
  }
  if(!boundary&&queue.length<=maxHolePixels){filledHoles++;filledPixels+=queue.length;for(const p of queue)result[p]=1;}
 }
 return {mask:result,filledPixels,filledHoles};
}
