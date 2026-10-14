import {assertMotifGraph,type MotifGraph,type MotifNode} from './motif-graph';
export type MotifPathPartition={elementId:string;cuts:number[];evidence:string};
/** Partition observed polylines at explicitly selected vertices. This creates
 * editable micro parts and exact contact ports, without inventing semantic labels.
 * Annotated ports or external constraints need an explicit remapping (unsupported).
 */
export function partitionObservedMotifPaths(input:MotifGraph,partitions:MotifPathPartition[]):MotifGraph{
 assertMotifGraph(input);const graph=structuredClone(input),selected=new Set<string>();
 for(const partition of partitions){
  const original=graph.nodes.find(n=>n.id===partition.elementId);
  if(!original?.geometry||original.kind!=='element'||selected.has(original.id)||!partition.evidence.trim())
   throw new Error('motif-partition:selection');
  selected.add(original.id);
  if(original.geometry.paths.length!==1||Object.keys(original.geometry.ports).length
   ||graph.relations.some(r=>r.kind==='repeat'?r.members.includes(original.id):r.kind==='junction'?r.from===original.id||r.to===original.id:r.from===original.id))
   throw new Error('motif-partition:remapping-required');
  const path=original.geometry.paths[0],cuts=partition.cuts;
  if(!cuts.length||cuts.some((c,i)=>!Number.isInteger(c)||c<=0||c>=path.length-1||i>0&&c<=cuts[i-1]))
   throw new Error('motif-partition:cuts');
  const bounds=[0,...cuts,path.length-1],parts:MotifNode[]=bounds.slice(1).map((end,i)=>{
   const points=path.slice(bounds[i],end+1);
   return {...structuredClone(original),id:`${original.id}:part-${i}`,evidence:[...original.evidence,partition.evidence],
    geometry:{namespace:'reference',paths:[points],ports:{start:points[0],end:points.at(-1)!}}};
  });
  if(parts.some(p=>graph.nodes.some(n=>n.id===p.id)))throw new Error('motif-partition:id-collision');
  graph.nodes=graph.nodes.flatMap(n=>n.id===original.id?parts:[n]);
  graph.relations=graph.relations.flatMap(r=>r.kind==='nest'&&r.to===original.id?parts.map(p=>({...r,to:p.id})):[r]);
  const contact=(a:MotifNode,b:MotifNode)=>graph.relations.push({kind:'junction',from:a.id,fromPort:'end',to:b.id,toPort:'start',toleranceMm:0});
  for(let i=1;i<parts.length;i++)contact(parts[i-1],parts[i]);
  if(path[0].x===path.at(-1)!.x&&path[0].y===path.at(-1)!.y)contact(parts.at(-1)!,parts[0]);
  const source=graph.provenance.find(p=>p.id===original.provenanceId)!;
  source.transformations.push({operation:'explicit observed path partition',
   evidence:`${original.id}; vertex cuts ${cuts.join(',')}; ${partition.evidence}; no semantic inference`});
 }
 assertMotifGraph(graph);return graph;
}
