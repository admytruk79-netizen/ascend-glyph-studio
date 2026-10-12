import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifNode,type MotifProvenance} from './motif-graph';
import {measureMotifClearance} from './motif-clearance';
import {measureMotifStructure} from './motif-reconstruction';
import {assertObservedContainment} from './motif-containment';
export type ObservedMotifAnnotations={
 schema:'ascend.observed-motif-annotations.v1';id:string;image:{width:number;height:number};provenance:MotifProvenance;
 review:{status:'draft'|'expert-reviewed';method:string;limitations:string[]};
 elements:{id:string;hypothesis:string;confidence:number;paths:[number,number][][];parentElementId:string|null;evidence:string;
  ports?:Record<string,[number,number]>}[];
 /** Explicit observed contact, not inferred from proximity or a floral label. */
 connections?:{from:string;fromPort:string;to:string;toPort:string;tolerancePx:number;evidence:string}[];
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
  for(const [name,p] of Object.entries(e.ports??{})){
   if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)||p.length!==2||!p.every(Number.isFinite)
    ||p[0]<0||p[0]>a.image.width||p[1]<0||p[1]>a.image.height)fail();
   Object.defineProperty(element.geometry.ports,name,{value:{x:p[0]*scale,y:p[1]*scale},enumerable:true});
  }
  if(e.parentElementId)relations.push({kind:'nest',from:`assembly:${e.parentElementId}`,to:element.id});
 }
 const contacts=new Set<string>();
 for(const c of a.connections??[]){
  if(!c.evidence?.trim()||!ids.has(c.from)||!ids.has(c.to)||c.from===c.to
   ||!Number.isFinite(c.tolerancePx)||c.tolerancePx<0||c.tolerancePx>2)fail();
  const key=[`${c.from}:${c.fromPort}`,`${c.to}:${c.toPort}`].sort().join('|');
  if(contacts.has(key))fail();contacts.add(key);
  relations.push({kind:'junction',from:`element:${c.from}`,fromPort:c.fromPort,
   to:`element:${c.to}`,toPort:c.toPort,toleranceMm:c.tolerancePx*scale});
 }
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:a.id,widthMm:referenceWidthMm,
  heightMm:a.image.height*scale,minGapMm:0,nodes,relations,negativeSpace:[],provenance:[structuredClone(a.provenance)]};
 graph.provenance[0].transformations.push({operation:'sparse observed contour annotation',evidence:`${a.id}; ${a.review.status}; normalized ${scale} mm/pixel; not physically calibrated; ${a.review.limitations.join('; ')}`});
 assertMotifGraph(graph);
 for(const e of a.elements)if(e.parentElementId){
  const parent=graph.nodes.find(n=>n.id===`element:${e.parentElementId}`)!;
  const child=graph.nodes.find(n=>n.id===`element:${e.id}`)!;
  assertObservedContainment(parent.geometry!.paths,child.geometry!.paths);
 }
 if(a.connections?.length){
  if(measureMotifStructure(graph).brokenJunctions||measureMotifClearance(graph).portsOffPath.length)
   throw new Error('motif-observed:unsupported-contact');
  graph.provenance[0].transformations.push({operation:'observed contact annotation',
   evidence:a.connections.map(c=>`${c.from}:${c.fromPort} -> ${c.to}:${c.toPort}; ${c.evidence}`).join('; ')});
 }
 return graph;
}
