import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifProvenance} from './motif-graph';
import {layoutReferenceMotifRegion,type MotifRegionLayout} from './motif-region-layout';
import {measureMotifStructure} from './motif-reconstruction';
import {measureMotifClearance} from './motif-clearance';
export type MotifCompositionField={id:string;xMm:number;yMm:number;source:MotifGraph;layout:MotifRegionLayout};
/** Compose separate fields using the existing uniform region fitter. Rectangles
 * reserve authored space; this does not infer historical grammar or garment cuts. */
export function composeReferenceMotifFields(widthMm:number,heightMm:number,fields:MotifCompositionField[]){
 const fail=(reason:string):never=>{throw new Error('motif-composition:'+reason);};
 if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>0)||!fields.length||fields.length>16)fail('dimensions');
 const ids=new Set<string>();
 for(const f of fields){
  if(!/^[A-Za-z][A-Za-z0-9.-]*$/.test(f.id)||ids.has(f.id))fail('field-id');ids.add(f.id);
  if(![f.xMm,f.yMm,f.layout.widthMm,f.layout.heightMm].every(Number.isFinite)
   ||f.xMm<0||f.yMm<0||f.layout.widthMm<=0||f.layout.heightMm<=0
   ||f.xMm+f.layout.widthMm>widthMm||f.yMm+f.layout.heightMm>heightMm)fail('field-envelope');
 }
 // Reject overlapping reserved rectangles even when their current paths happen
 // to miss each other. Subsequent motif changes must not consume another field.
 for(let i=0;i<fields.length;i++)for(let j=i+1;j<fields.length;j++){
  const a=fields[i],b=fields[j];
  if(a.xMm<b.xMm+b.layout.widthMm&&b.xMm<a.xMm+a.layout.widthMm
   &&a.yMm<b.yMm+b.layout.heightMm&&b.yMm<a.yMm+a.layout.heightMm)fail('overlapping-fields');
 }
 const fitted=fields.map(f=>({field:f,result:layoutReferenceMotifRegion(f.source,f.layout)}));
 const sources=new Map<string,MotifProvenance>();
 for(const f of fields)for(const p of f.source.provenance){
  const existing=sources.get(p.id);
  if(existing&&JSON.stringify(existing)!==JSON.stringify(p))fail('conflicting-provenance');
  sources.set(p.id,structuredClone(p));
 }
 const first=[...sources.values()][0];
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:fields.map(f=>`${f.id}:${f.source.seed}`).join('|'),
  widthMm,heightMm,minGapMm:fields.reduce((n,f)=>Math.max(n,f.source.minGapMm),0),provenance:[...sources.values()],
  nodes:[{id:'composition',kind:'composition',provenanceId:first.id,confidence:first.confidence,
   evidence:['authored separate composition fields; not source-attributed historical layout'],transform:identityMotifTransform()}],relations:[],negativeSpace:[]};
 for(const {field:f,result} of fitted){
  const prefix=(id:string)=>`${f.id}:${id}`;
  for(const sourceNode of result.graph.nodes){
   if(sourceNode.kind==='composition')continue;
   const n=structuredClone(sourceNode);n.id=prefix(n.id);
   n.parentId=sourceNode.kind==='region'?'composition':prefix(sourceNode.parentId!);
   if(sourceNode.kind==='region'){n.transform.xMm+=f.xMm;n.transform.yMm+=f.yMm;}
   graph.nodes.push(n);
  }
  for(const relation of result.graph.relations){
   const r=structuredClone(relation);
   if(r.kind==='repeat')r.members=r.members.map(prefix);else{r.from=prefix(r.from);r.to=prefix(r.to);}
   graph.relations.push(r);
  }
  for(const r of result.graph.negativeSpace)graph.negativeSpace.push({...r,xMm:r.xMm+f.xMm,yMm:r.yMm+f.yMm});
 }
 const summary=fields.map(f=>({id:f.id,xMm:f.xMm,yMm:f.yMm,layout:structuredClone(f.layout),sourceSeed:f.source.seed}));
 for(const p of graph.provenance)p.transformations.push({operation:'authored separate composition fields',evidence:JSON.stringify(summary)});
 assertMotifGraph(graph);
 const structure=measureMotifStructure(graph),clearance=measureMotifClearance(graph);
 if(structure.brokenJunctions||structure.brokenRepeats||structure.negativeSpaceViolations||clearance.portsOffPath.length
  ||clearance.outsideEnvelope.length||clearance.clearanceViolations.length)fail('reference-constraints');
 return {graph,fields:summary,structure,clearance,productionApproved:false as const};
}
