import {assertMotifGraph,transformMotifPoint,type MotifGraph} from './motif-graph';
import type {StitchIrObject} from './production-stitch-ir';
import {compileProductionObjectsToStitchIr} from './production-stitch-ir';
import {productionObjectsFromTopology,placeProductionObjects} from './production-object';
import type {ConstructionEnvelope} from './construction-envelope';
import {primitiveForForm} from './ascend-primitives';
import {planEmbroideryJob} from './manufacturing-job-plan';
import type {MachineTemplate} from './machine-template';
import {measureMotifClearance} from './motif-clearance';
import {inferAnnotatedRepeatLattices} from './motif-repeat-inference';

/** Baseline consumes explicit annotations, not unannotated raster images or a trained model. */
export function decomposeAnnotatedMotif(annotations:MotifGraph,options:{inferRepeats?:boolean}={}):MotifGraph {
 const graph=JSON.parse(JSON.stringify(annotations)) as MotifGraph;assertMotifGraph(graph);
 return options.inferRepeats?inferAnnotatedRepeatLattices(graph):graph;
}
export function reconstructMotif(graph:MotifGraph):StitchIrObject[]{
 assertMotifGraph(graph);
 return graph.nodes.flatMap(n=>(n.geometry?.paths??[]).map((path,i)=>({kind:'run' as const,id:`${n.id}:p${i}`,color:'#111111',length:2.5,path:path.map(p=>transformMotifPoint(graph,n.id,p))})));
}
export function measureMotifStructure(graph:MotifGraph){
 const ir=reconstructMotif(graph);let junctionCount=0,brokenJunctions=0,repeatCount=0,brokenRepeats=0;
 for(const r of graph.relations){
  if(r.kind==='junction'){junctionCount++;const a=graph.nodes.find(n=>n.id===r.from)!,b=graph.nodes.find(n=>n.id===r.to)!;
   const x=transformMotifPoint(graph,a.id,a.geometry!.ports[r.fromPort]),y=transformMotifPoint(graph,b.id,b.geometry!.ports[r.toPort]);
   if(Math.hypot(x.x-y.x,x.y-y.y)>r.toleranceMm)brokenJunctions++;
  }
  if(r.kind==='repeat'){repeatCount++;const points=r.members.map(id=>transformMotifPoint(graph,id,{x:0,y:0}));
   if(points.slice(1).some((p,i)=>Math.hypot(p.x-points[i].x-r.stepMm.x,p.y-points[i].y-r.stepMm.y)>r.toleranceMm))brokenRepeats++;
  }
 }
 // Segment/rectangle clipping detects paths crossing protected space, including segments with both endpoints outside.
 const crosses=(a:{x:number;y:number},b:{x:number;y:number},r:MotifGraph['negativeSpace'][number])=>{
  let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const [p,q] of [[-dx,a.x-r.xMm],[dx,r.xMm+r.widthMm-a.x],[-dy,a.y-r.yMm],[dy,r.yMm+r.heightMm-a.y]]){
   if(p===0){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
  }return true;
 };
 const negativeSpaceViolations=ir.filter(o=>o.kind==='run'&&o.path.slice(1).some((p,i)=>graph.negativeSpace.some(r=>crosses(o.path[i],p,r)))).length;
 return {junctionCount,brokenJunctions,repeatCount,brokenRepeats,nestedRelations:graph.relations.filter(r=>r.kind==='nest').length,negativeSpaceViolations};
}
/** Explicit design mapping, not inferred cultural equivalence or historical-to-canonical relabeling.
 * Reuses canonical production objects and compiler; unsupported distortions fail closed. */
export function assembleAscendMotif(graph:MotifGraph,mapping:Record<string,string>,envelope:ConstructionEnvelope,options:{machine?:MachineTemplate}={}){
 assertMotifGraph(graph);const elements=graph.nodes.filter(n=>n.kind==='element');
 if(envelope.machine&&!options.machine)throw new Error('motif-machine-template-required');
 if(envelope.machine&&envelope.machine.id!==options.machine?.id)throw new Error('motif-machine-envelope-mismatch');
 if(Object.keys(mapping).length!==elements.length||elements.some(n=>!mapping[n.id]))throw new Error('explicit ASCEND mapping required for every element');
 const base=Math.max(8,envelope.minFeatureMm*8);
 const nodes=elements.map(n=>{const form=mapping[n.id];if(!primitiveForForm(form))throw new Error('unknown canonical ASCEND form');
  let cursor:typeof n|undefined=n;
  while(cursor){const t=cursor.transform;if(t.reflectX||Math.abs(t.scaleX-t.scaleY)>1e-9)throw new Error('canonical bridge does not support reflection or anisotropic scale');cursor=graph.nodes.find(p=>p.id===cursor!.parentId);}
  const a=transformMotifPoint(graph,n.id,{x:0,y:0}),b=transformMotifPoint(graph,n.id,{x:1,y:0});const scale=Math.hypot(b.x-a.x,b.y-a.y)*100/base;
  if(scale<.5||scale>envelope.maxScaleLevels)throw new Error('canonical bridge scale outside construction envelope');
  return {id:n.id,conceptId:`explicit-mapping:${n.id}`,form,scale};});
 const objects=productionObjectsFromTopology({nodes,edges:[]},envelope);
 const placed=placeProductionObjects(objects,Object.fromEntries(elements.map(n=>{const p=transformMotifPoint(graph,n.id,{x:50,y:50}),a=transformMotifPoint(graph,n.id,{x:0,y:0}),b=transformMotifPoint(graph,n.id,{x:1,y:0});return [n.id,{x:p.x,y:p.y,angleDeg:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}];})));
 const stitchObjects=compileProductionObjectsToStitchIr(placed),job=planEmbroideryJob(stitchObjects,{widthMm:graph.widthMm,heightMm:graph.heightMm,machine:options.machine});
 const referenceStructure=measureMotifStructure(graph),referenceClearance=measureMotifClearance(graph);
 if(referenceStructure.brokenJunctions||referenceStructure.brokenRepeats||referenceStructure.negativeSpaceViolations
  ||referenceClearance.clearanceViolations.length||referenceClearance.portsOffPath.length||referenceClearance.outsideEnvelope.length)
  job.validation.errors.push('motif-reference-layout-invalid');
 // A reference graph's ports and clearances cannot certify different, explicitly mapped glyph geometry.
 job.validation.valid=false;job.validation.errors.push('motif-canonical-layout-unvalidated');
 return {state:'REFERENCE' as const,productionObjects:placed,stitchObjects,job,provenance:graph.provenance,referenceStructure,referenceClearance,
  warnings:['Reference relations do not certify junctions or clearance in the separately mapped ASCEND design.','Machine feasibility, stitch count, calibration and sew-out remain required.']};
}
