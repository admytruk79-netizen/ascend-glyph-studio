import {assertMotifGraph,transformMotifPoint,type MotifGraph,type MotifNode} from './motif-graph';

/** Infer translation-only 1D lattices from at least three annotated compound vectors.
 * Input annotations supply segmentation. No raster segmentation or cultural equivalence is inferred.
 * Only same-parent, same-provenance, identical world-relative vector families are grouped.
 */
export function inferAnnotatedRepeatLattices(input:MotifGraph):MotifGraph {
 assertMotifGraph(input);const graph=structuredClone(input),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const groups=new Map<string,{node:MotifNode;origin:{x:number;y:number};descendants:MotifNode[]}[]>();
 for(const node of graph.nodes.filter(n=>n.kind==='assembly')){
  const descendants=graph.nodes.filter(n=>{
   if(n.kind!=='element')return false;let parent=n.parentId;
   while(parent){if(parent===node.id)return true;parent=byId.get(parent)?.parentId;}return false;
  });
  if(!descendants.length)continue;
  const origin=transformMotifPoint(graph,node.id,{x:0,y:0});
  const shapeById=new Map(descendants.map(n=>{
   const point=(p:{x:number;y:number})=>{const q=transformMotifPoint(graph,n.id,p);return [Number((q.x-origin.x).toFixed(6)),Number((q.y-origin.y).toFixed(6))];};
   let depth=0,parent=n.parentId;while(parent&&parent!==node.id){depth++;parent=byId.get(parent)?.parentId;}
   const shape=JSON.stringify({depth,paths:n.geometry!.paths.map(path=>JSON.stringify(path.map(point))).sort(),ports:Object.entries(n.geometry!.ports).sort(([a],[b])=>(a<b?-1:a>b?1:0)).map(([id,p])=>[id,point(p)])});
   return [n.id,shape];
  }));
  const shapes=[...shapeById.values()].sort();
  const junctions=graph.relations.flatMap(r=>r.kind==='junction'&&shapeById.has(r.from)&&shapeById.has(r.to)
   ?[JSON.stringify([shapeById.get(r.from),r.fromPort,shapeById.get(r.to),r.toPort,r.toleranceMm])]:[]).sort();
  const provenance=[...new Set([node.provenanceId,...descendants.map(n=>n.provenanceId)])].sort();
  const key=JSON.stringify([node.parentId,provenance,shapes,junctions]);
  const group=groups.get(key)??[];group.push({node,origin,descendants});groups.set(key,group);
 }
 for(const group of groups.values()){
  if(group.length<3)continue;
  group.sort((a,b)=>a.origin.x-b.origin.x||a.origin.y-b.origin.y);
  const members=group.map(x=>x.node.id);
  if(graph.relations.some(r=>r.kind==='repeat'&&r.members.some(id=>members.includes(id))))continue;
  const stepMm={x:group[1].origin.x-group[0].origin.x,y:group[1].origin.y-group[0].origin.y};
  const toleranceMm=.01;
  if(Math.hypot(stepMm.x,stepMm.y)<1e-6||group.slice(1).some((item,i)=>Math.hypot(item.origin.x-group[i].origin.x-stepMm.x,item.origin.y-group[i].origin.y-stepMm.y)>toleranceMm))continue;
  const evidence=[...new Set(group.flatMap(item=>[...item.node.evidence,...item.descendants.flatMap(n=>n.evidence)]))];
  // Confidence is bounded by declared input annotation confidence, not a trained probability.
  const confidence=Math.min(...group.flatMap(item=>[item.node.confidence,...item.descendants.map(n=>n.confidence)]),
   ...graph.provenance.filter(p=>group.some(item=>item.node.provenanceId===p.id||item.descendants.some(n=>n.provenanceId===p.id))).map(p=>p.confidence));
  graph.relations.push({kind:'repeat',members,stepMm,toleranceMm,inference:{method:'translated-annotated-vectors-v1',confidence,evidence}});
  for(const id of new Set(group.flatMap(item=>[item.node.provenanceId,...item.descendants.map(n=>n.provenanceId)]))){
   graph.provenance.find(p=>p.id===id)!.transformations.push({operation:`translated-vector-lattice:${members.join(',')}`,evidence:evidence.join(';')});
  }
 }
 assertMotifGraph(graph);return graph;
}
