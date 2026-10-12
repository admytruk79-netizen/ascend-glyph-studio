import {assertMotifGraph,type MotifGraph} from './motif-graph';
import {measureMotifStructure} from './motif-reconstruction';
import {measureMotifClearance} from './motif-clearance';
/** Descriptive construction statistics from declared contacts/nesting.
 * Units are outermost assemblies below a region. Insets collapse into their
 * parent unit. Degree is attached unit neighbours, not a physical junction's
 * valence; cycles describe the unit network, not holes or stitch topology.
 */
export function profileMotifConstruction(graph:MotifGraph){
 assertMotifGraph(graph);
 const structure=measureMotifStructure(graph),clearance=measureMotifClearance(graph);
 if(structure.brokenJunctions||structure.brokenRepeats||structure.negativeSpaceViolations
  ||clearance.portsOffPath.length||clearance.outsideEnvelope.length||clearance.clearanceViolations.length)
  throw new Error('motif-construction:invalid-reference');
 const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
 const unitOf=(elementId:string)=>{
  let n=nodes.get(elementId)!;
  while(n.parentId&&nodes.get(n.parentId)!.kind!=='region')n=nodes.get(n.parentId)!;
  return n.id;
 };
 const elements=graph.nodes.filter(n=>n.kind==='element');
 const nestingDepth=(elementId:string)=>{
  let n=nodes.get(nodes.get(elementId)!.parentId!)!,depth=0;
  while(n.parentId&&nodes.get(n.parentId)!.kind==='assembly'){depth++;n=nodes.get(n.parentId)!;}
  return depth;
 };
 const units=[...new Set(elements.map(n=>unitOf(n.id)))].sort();
 const neighbours=new Map(units.map(id=>[id,new Set<string>()]));
 let internalContacts=0;
 for(const r of graph.relations)if(r.kind==='junction'){
  const a=unitOf(r.from),b=unitOf(r.to);
  if(a===b){internalContacts++;continue;}
  neighbours.get(a)!.add(b);neighbours.get(b)!.add(a);
 }
 const visited=new Set<string>();let components=0;
 for(const id of units){if(visited.has(id))continue;components++;
  const queue=[id];visited.add(id);
  for(let i=0;i<queue.length;i++)for(const n of neighbours.get(queue[i])!)if(!visited.has(n)){visited.add(n);queue.push(n);}
 }
 const unitDegrees=units.map(id=>({id,neighbours:[...neighbours.get(id)!].sort(),degree:neighbours.get(id)!.size}));
 const edges=unitDegrees.reduce((n,u)=>n+u.degree,0)/2;
 return {schema:'ascend.motif-construction-profile.v1' as const,state:'REFERENCE' as const,method:'declared-unit-network-v1' as const,
  sourceEvidence:graph.provenance.map(p=>({id:p.id,source:p.source,originalSha256:p.originalSha256,
   creator:p.creator,community:p.community,culturalContext:p.culturalContext,access:p.access,confidence:p.confidence,permissionEvidence:p.permission.evidence})),
  regionCount:graph.nodes.filter(n=>n.kind==='region').length,elementCount:elements.length,
  closedContourCount:elements.flatMap(n=>n.geometry!.paths).filter(path=>path[0].x===path.at(-1)!.x&&path[0].y===path.at(-1)!.y).length,
  nestedRelationCount:structure.nestedRelations,maximumAssemblyNestingDepth:elements.reduce((n,e)=>Math.max(n,nestingDepth(e.id)),0),declaredContactCount:structure.junctionCount,
  internalUnitContactCount:internalContacts,unitCount:units.length,unitEdgeCount:edges,connectedUnitComponents:components,
  unitContactCycleRank:edges-units.length+components,terminalUnitCount:unitDegrees.filter(u=>u.degree===1).length,
  multiNeighbourUnitCount:unitDegrees.filter(u=>u.degree>=3).length,maxUnitDegree:unitDegrees.reduce((n,u)=>Math.max(n,u.degree),0),
  declaredRepeatGroupCount:structure.repeatCount,unitDegrees,
  minimumElementConfidence:elements.length?elements.reduce((n,e)=>Math.min(n,e.confidence),1):null,
  historicalGrammarVerified:false as const,productionApproved:false as const};
}
