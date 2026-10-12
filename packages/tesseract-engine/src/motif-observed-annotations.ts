import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifNode,type MotifProvenance} from './motif-graph';
export type ObservedMotifAnnotations={
 schema:'ascend.observed-motif-annotations.v1';id:string;image:{width:number;height:number};provenance:MotifProvenance;
 review:{status:'draft'|'expert-reviewed';method:string;limitations:string[]};
 elements:{id:string;hypothesis:string;confidence:number;paths:[number,number][][];parentElementId:string|null;evidence:string}[];
};
/** Sparse observed contours, normalized to reference mm. Semantic labels remain hypotheses.
 * Parent annotations express spatial containment only, never stitch connectivity. */
export function graphFromObservedAnnotations(a:ObservedMotifAnnotations,referenceWidthMm=100):MotifGraph{
 const fail=()=>{throw new Error('motif-observed:invalid-annotation');};
 if(a.schema!=='ascend.observed-motif-annotations.v1'||!a.id||!a.review.method
  ||!['draft','expert-reviewed'].includes(a.review.status)||!a.review.limitations.length
  ||!Number.isInteger(a.image.width)||!Number.isInteger(a.image.height)||a.image.width<2||a.image.height<2
  ||!Number.isFinite(referenceWidthMm)||referenceWidthMm<=0||!a.elements.length)fail();
 const ids=new Set(a.elements.map(e=>e.id));if(ids.size!==a.elements.length)fail();
 const scale=referenceWidthMm/a.image.width;
 const node=(id:string,kind:MotifNode['kind'],parentId?:string):MotifNode=>({id,kind,parentId,provenanceId:a.provenance.id,
  confidence:a.provenance.confidence,evidence:[a.review.method],transform:identityMotifTransform()});
 const nodes:MotifNode[]=[node('composition','composition'),node('field','region','composition')];
 const relations:MotifGraph['relations']=[];
 for(const e of a.elements){
  if(!e.hypothesis||!e.evidence||!Number.isFinite(e.confidence)||e.confidence<0||e.confidence>1
   ||e.parentElementId!==null&&!ids.has(e.parentElementId))fail();
  const assembly=node(`assembly:${e.id}`,'assembly',e.parentElementId?`assembly:${e.parentElementId}`:'field');nodes.push(assembly);
  const element=node(`element:${e.id}`,'element',assembly.id);
  element.confidence=Math.min(e.confidence,a.provenance.confidence);
  element.evidence=[e.evidence,`visual hypothesis: ${e.hypothesis}; review: ${a.review.status}`];
  element.geometry={namespace:'reference',ports:{},paths:e.paths.map(path=>path.map(p=>{
   if(p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>a.image.width||p[1]<0||p[1]>a.image.height)fail();
   return {x:p[0]*scale,y:p[1]*scale};
  }))};nodes.push(element);
  if(e.parentElementId)relations.push({kind:'nest',from:`assembly:${e.parentElementId}`,to:element.id});
 }
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:a.id,widthMm:referenceWidthMm,
  heightMm:a.image.height*scale,minGapMm:0,nodes,relations,negativeSpace:[],provenance:[structuredClone(a.provenance)]};
 graph.provenance[0].transformations.push({operation:'sparse observed contour annotation',evidence:`${a.id}; ${a.review.status}; normalized ${scale} mm/pixel; not physically calibrated; ${a.review.limitations.join('; ')}`});
 assertMotifGraph(graph);return graph;
}
