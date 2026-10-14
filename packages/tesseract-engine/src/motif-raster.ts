import {components} from './raster-features';
import {deconstruct,type Deconstruction} from './raster-deconstruction';
import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifNode,type MotifProvenance} from './motif-graph';

export type RasterMotif = {
 graph:MotifGraph; analysis:Deconstruction;
 representation:'foreground-row-runs-v1'; pixelPitchMm:number;
 calibration:'reference-normalization'; foregroundPixels:number;
};
/** Lossless binary-mask baseline, not a semantic motif or machine stitch plan.
 * Caller supplies a reviewed segmentation and provenance of the original image.
 * Row runs preserve holes and fine detail without inventing flowers/animals.
 */
export function decomposeMotifMask(mask:Uint8Array,width:number,height:number,
 provenance:MotifProvenance,referenceWidthMm:number):RasterMotif {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144
  ||mask.length!==width*height||mask.some(v=>v!==0&&v!==1))throw new Error('motif-raster:binary-raster');
 if(!Number.isFinite(referenceWidthMm)||referenceWidthMm<=0)throw new Error('motif-raster:reference-scale');
 const pitch=referenceWidthMm/width;
 if(!Number.isFinite(pitch*height)||pitch===0)throw new Error('motif-raster:reference-scale');
 const node=(id:string,kind:MotifNode['kind'],parentId?:string):MotifNode=>({id,kind,parentId,
  provenanceId:provenance.id,confidence:provenance.confidence,
  evidence:['reviewed-input-mask; 4-connected components; no semantic classification'],transform:identityMotifTransform()});
 const nodes:MotifNode[]=[node('composition','composition'),node('field','region','composition')];
 const groups=components(mask,width,height,0,1);
 groups.forEach((pixels,i)=>{
  const id=`component-${i}`;nodes.push(node(id,'assembly','field'));
  const runs: {x:number;y:number}[][]=[];
  const sorted=pixels.slice().sort((a,b)=>a-b);
  for(let j=0;j<sorted.length;){const start=sorted[j]!,row=Math.floor(start/width);let end=start;j++;
   while(j<sorted.length&&sorted[j]===end+1&&Math.floor(sorted[j]!/width)===row){end=sorted[j]!;j++;}
   runs.push([{x:(start%width)*pitch,y:(row+.5)*pitch},{x:(end%width+1)*pitch,y:(row+.5)*pitch}]);
  }
  const element=node(`pixels-${i}`,'element',id);element.geometry={namespace:'reference',paths:runs,ports:{}};nodes.push(element);
 });
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:'raster-row-runs-v1',
  widthMm:referenceWidthMm,heightMm:height*pitch,minGapMm:0,nodes,relations:[],negativeSpace:[],
  provenance:[{...structuredClone(provenance),transformations:[...provenance.transformations,
   {operation:'binary mask decomposition',evidence:`${width}x${height}; explicit reference normalization ${pitch} mm/pixel; not physical calibration` }]}]};
 assertMotifGraph(graph);
 return {graph,analysis:deconstruct({data:Uint8Array.from(mask,v=>v?0:255),width,height}),
  representation:'foreground-row-runs-v1',pixelPitchMm:pitch,calibration:'reference-normalization',foregroundPixels:groups.reduce((n,p)=>n+p.length,0)};
}

/** Decode only this baseline representation, independently of embroidery IR. */
export function reconstructMotifMask(result:RasterMotif,width:number,height:number):Uint8Array {
 assertMotifGraph(result.graph);
 const pitch=result.pixelPitchMm;
 if(!Number.isFinite(pitch)||pitch<=0||!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2
  ||width*height>262144||Math.abs(width*pitch-result.graph.widthMm)>1e-8||Math.abs(height*pitch-result.graph.heightMm)>1e-8)
  throw new Error('motif-raster:decode-dimensions');
 const out=new Uint8Array(width*height);
 for(const node of result.graph.nodes){
  if(Object.entries(node.transform).some(([k,v])=>v!==identityMotifTransform()[k as keyof ReturnType<typeof identityMotifTransform>]))throw new Error('motif-raster:decode-transform');
  for(const path of node.geometry?.paths??[]){
   if(path.length!==2)throw new Error('motif-raster:decode-run');
   const [a,b]=path;const x=a!.x/pitch,end=b!.x/pitch,y=a!.y/pitch-.5;
   const near=(v:number)=>Math.abs(v-Math.round(v))<1e-8;
   if(!near(x)||!near(end)||!near(y)||b!.y!==a!.y||x<0||end>width||end<=x||y<0||y>=height)throw new Error('motif-raster:decode-run');
   out.fill(1,Math.round(y)*width+Math.round(x),Math.round(y)*width+Math.round(end));
  }
 }
 return out;
}
