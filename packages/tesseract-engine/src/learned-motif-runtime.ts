import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifProvenance} from './motif-graph';
import {measureMotifStructure} from './motif-reconstruction';
import {planEmbroideryJob} from './manufacturing-job-plan';
import type {StitchIrObject,StitchIrPoint} from './production-stitch-ir';
import type {MachineTemplate} from './machine-template';
export type LearnedMotifSnapshot={schema:'ascend.neon-lego-snapshot.v1';source:{projectId:string;modelId:string;modelVersion:string;modelBuiltAt:string;traditionScope:string;retrievedAt:string;reviewState:'unreviewed-reference';trainingDatasetRightsAudited:boolean;countsAreStoredModelStatistics:boolean};
 grammar:{images:number;bricks:Record<string,{share:number;perImage:number;extent:number;colors?:string[]}>;pairs:Record<string,{n:number;dx:number;dy:number;ratio:number}>;mirrorV:number}};
export function assertLearnedMotifSnapshot(s:LearnedMotifSnapshot){
 const fail=()=>{throw Error('learned-motif:invalid-snapshot');};
 if(s.schema!=='ascend.neon-lego-snapshot.v1'||!s.source.modelId||s.source.traditionScope!=='Ukrainian'||s.source.reviewState!=='unreviewed-reference'||!Number.isFinite(Date.parse(s.source.modelBuiltAt))||!Number.isFinite(Date.parse(s.source.retrievedAt))||!s.source.countsAreStoredModelStatistics)fail();
 const g=s.grammar;if(!Number.isInteger(g.images)||g.images<1||!Object.keys(g.bricks).length||!Number.isFinite(g.mirrorV)||g.mirrorV<0||g.mirrorV>1)fail();
 for(const [id,b] of Object.entries(g.bricks))if(!/^[a-z0-9-]+$/.test(id)||![b.share,b.perImage,b.extent].every(Number.isFinite)||b.share<0||b.share>1||b.perImage<0||b.extent<=0)fail();
 for(const [key,p] of Object.entries(g.pairs))if(!/^[a-z0-9-]+\|[a-z0-9-]+$/.test(key)||![p.n,p.dx,p.dy,p.ratio].every(Number.isFinite)||p.n<0||p.ratio<=0)fail();
}
/** Bridge existing blend vocabulary and stitch objects to Tesseract graph and
 * machine gates. Learned aggregate statistics do not establish source rights. */
export function inspectAuthoredMotifAssembly(objects:StitchIrObject[],connections:{fromId:string;fromPoint:StitchIrPoint;toId:string;toPoint:StitchIrPoint}[],
 input:{widthMm:number;heightMm:number;seed:string},authoredProvenance:MotifProvenance,machine?:MachineTemplate,assemblies?:{id:string;brick:string|null;role:string;objectIds:string[]}[]){
 const base={provenanceId:authoredProvenance.id,confidence:authoredProvenance.confidence,evidence:authoredProvenance.transformations.map(t=>t.evidence),transform:identityMotifTransform()};
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:input.seed,widthMm:input.widthMm,heightMm:input.heightMm,minGapMm:0,provenance:[structuredClone(authoredProvenance)],relations:[],negativeSpace:[],nodes:[
  {...structuredClone(base),id:'composition',kind:'composition'},{...structuredClone(base),id:'field',kind:'region',parentId:'composition'}]};
 const owner=new Map<string,string>();
 for(const a of assemblies??[]){
  const id=`motif:${a.id}`;graph.nodes.push({...structuredClone(base),id,kind:'assembly',parentId:'field',evidence:[`authored ${a.role} motif; vocabulary ${a.brick??'framing/connections'}`]});
  for(const objectId of a.objectIds){if(owner.has(objectId)||!objects.some(o=>o.id===objectId))throw Error('learned-motif:assembly-ownership');owner.set(objectId,id);}
 }
 if(assemblies&&owner.size!==objects.length)throw Error('learned-motif:incomplete-assemblies');
 for(const o of objects){const path=o.kind==='fill'?[...o.polygon,{...o.polygon[0]!}]:structuredClone(o.path);
  if(!assemblies)graph.nodes.push({...structuredClone(base),id:`assembly:${o.id}`,kind:'assembly',parentId:'field'});
  graph.nodes.push({...structuredClone(base),id:o.id,kind:'element',parentId:owner.get(o.id)??`assembly:${o.id}`,geometry:{namespace:'reference',paths:[path],ports:{}}});
 }
 connections.forEach((c,i)=>{
  const from=graph.nodes.find(n=>n.id===c.fromId),to=graph.nodes.find(n=>n.id===c.toId);if(!from?.geometry||!to?.geometry)throw Error('learned-motif:missing-port-owner');
  const onPath=(paths:StitchIrPoint[][],p:StitchIrPoint)=>paths.some(path=>path.slice(1).some((b,j)=>{
   const a=path[j]!,dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
   return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<1e-6;
  }));
  if(!onPath(from.geometry.paths,c.fromPoint)||!onPath(to.geometry.paths,c.toPoint))throw Error('learned-motif:port-off-path');
  from.geometry.ports[`connection-${i}`]={...c.fromPoint};to.geometry.ports[`connection-${i}`]={...c.toPoint};
  graph.relations.push({kind:'junction',from:from.id,fromPort:`connection-${i}`,to:to.id,toPort:`connection-${i}`,toleranceMm:1e-8});
 });
 assertMotifGraph(graph);const structure=measureMotifStructure(graph);
 if(structure.brokenJunctions)throw Error('learned-motif:broken-junction');
 const job=planEmbroideryJob(objects,{widthMm:input.widthMm,heightMm:input.heightMm,machine});
 return {graph,structure,job,learnedModelApplied:false,modelTrainingPerformed:false,canonicalGeometryChanged:false,physicalCalibration:null,productionApproved:false as const};
}
export function inspectLearnedMotifAssembly(snapshot:LearnedMotifSnapshot,objects:StitchIrObject[],connections:{fromId:string;fromPoint:StitchIrPoint;toId:string;toPoint:StitchIrPoint}[],
 input:{widthMm:number;heightMm:number;seed:string},authoredProvenance:MotifProvenance,machine?:MachineTemplate,assemblies?:{id:string;brick:string|null;role:string;objectIds:string[]}[]){
 assertLearnedMotifSnapshot(snapshot);
 const checked=inspectAuthoredMotifAssembly(objects,connections,input,authoredProvenance,machine,assemblies);
 return {...checked,modelApplied:{id:snapshot.source.modelId,version:snapshot.source.modelVersion,builtAt:snapshot.source.modelBuiltAt,scope:snapshot.source.traditionScope,
 grammarImages:snapshot.grammar.images,interpretation:'stored model statistic, not audited training-image count',reviewState:snapshot.source.reviewState},learnedModelApplied:true};
}
