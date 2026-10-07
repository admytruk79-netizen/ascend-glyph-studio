/**
 * Motif-Lego representation.
 *
 * Pixel/contour primitives are implementation detail.  The generator reasons in
 * reusable visual parts (motifs), their instances, repeat cells and relations.
 * This is deliberately above line/circle topology.
 */
export type MotifRole="core"|"satellite"|"connector"|"filler"|"border-cell"|"corner"|"terminal";
export type MotifRelation="repeat"|"mirror"|"rotate"|"nest"|"interlock"|"alternate"|"attach"|"surround"|"transition";

export type MotifGeometry={
 silhouette:string;                 // normalized closed/open SVG path(s), preserved as one semantic part
 holes?:string[];                   // negative-space contours belonging to the part
 aspect:number;
};

export type MotifPart={
 id:string;familyId:string;role:MotifRole;geometry:MotifGeometry;
 sourceIds:string[];confidence:number;
 invariants:{preserveSilhouette:boolean;preserveHoles:boolean;allowedTransforms:("translate"|"scale"|"rotate"|"mirror")[]};
 tags:string[];
};

export type MotifInstance={
 id:string;partId:string;x01:number;y01:number;scale:number;rotationDeg:number;mirrorX:boolean;layer:number;
};

export type MotifLink={from:string;to:string;relation:MotifRelation;weight:number};
export type RepeatCell={id:string;instanceIds:string[];axis:"horizontal"|"vertical"|"radial"|"field";period01:number;mirrorAlternate?:boolean};
export type MotifGrammar={
 id:string;parts:MotifPart[];instances:MotifInstance[];links:MotifLink[];repeatCells:RepeatCell[];
 sourceIds:string[];confidence:number;
};

export function validateMotifGrammar(g:MotifGrammar):string[]{
 const e:string[]=[],parts=new Set(g.parts.map(x=>x.id)),instances=new Set(g.instances.map(x=>x.id));
 if(!g.parts.length)e.push("motif-grammar-has-no-parts");
 if(!g.instances.length)e.push("motif-grammar-has-no-instances");
 for(const i of g.instances)if(!parts.has(i.partId))e.push(`motif-instance-missing-part:${i.id}`);
 for(const l of g.links)if(!instances.has(l.from)||!instances.has(l.to))e.push(`motif-link-missing-instance:${l.from}:${l.to}`);
 for(const c of g.repeatCells)for(const id of c.instanceIds)if(!instances.has(id))e.push(`repeat-cell-missing-instance:${c.id}:${id}`);
 return [...new Set(e)];
}

/** Structural mutation changes composition while preserving each Lego part's internal geometry. */
export function mutateMotifGrammar(g:MotifGrammar,seed:number):MotifGrammar{
 const jitter=(n:number)=>(((Math.imul(seed+n,2654435761)>>>0)%2001)/1000-1);
 const instances=g.instances.map((i,n)=>({
  ...i,
  x01:Math.max(0,Math.min(1,i.x01+jitter(n*7)*.035)),
  y01:Math.max(0,Math.min(1,i.y01+jitter(n*11+3)*.035)),
  rotationDeg:i.rotationDeg+(i.partId.length+n+seed)%3===0?15*jitter(n+17):0,
  mirrorX:((seed+n)%5===0)?!i.mirrorX:i.mirrorX
 }));
 return {...g,id:`${g.id}:mutation:${seed}`,instances};
}


export type MotifHierarchyKind="sub-motif"|"motif"|"compound-motif"|"repeat-cell"|"band"|"field"|"composition";
export type MotifHierarchyNode={
 id:string;kind:MotifHierarchyKind;childIds:string[];instanceIds:string[];
 sourceIds:string[];confidence:number;depth:number;
};
export type MotifHierarchy={rootId:string;nodes:MotifHierarchyNode[];maxDepth:number;instanceCount:number};

/**
 * Builds a hierarchy without imposing a motif/instance ceiling.
 * Leaf instances are grouped spatially, then recursively grouped into larger visual Lego assemblies.
 * branchFactor controls grouping granularity, not maximum complexity.
 */
export function buildMotifHierarchy(g:MotifGrammar,branchFactor=8):MotifHierarchy{
 const bf=Math.max(2,Math.floor(branchFactor)),nodes:MotifHierarchyNode[]=[];
 const ordered=[...g.instances].sort((a,b)=>a.layer-b.layer||a.y01-b.y01||a.x01-b.x01||a.id.localeCompare(b.id));
 let level=ordered.map(x=>{
  const id="sub:"+x.id;
  nodes.push({id,kind:"sub-motif" as const,childIds:[],instanceIds:[x.id],sourceIds:g.sourceIds,confidence:g.confidence,depth:0});
  return id;
 });
 let depth=0;
 const kinds:MotifHierarchyKind[]=["motif","compound-motif","repeat-cell","band","field"];
 while(level.length>1){
  depth++;
  const next:string[]=[];
  for(let i=0;i<level.length;i+=bf){
   const children=level.slice(i,i+bf);
   const childNodes=children.map(id=>nodes.find(n=>n.id===id)!);
   const instanceIds=[...new Set(childNodes.flatMap(n=>n.instanceIds))];
   const kind=kinds[Math.min(depth-1,kinds.length-1)]!;
   const id=kind+":"+depth+":"+Math.floor(i/bf);
   nodes.push({id,kind,childIds:children,instanceIds,sourceIds:g.sourceIds,confidence:g.confidence,depth});
   next.push(id);
  }
  level=next;
 }
 const rootChild=level[0]!;
 const rootDepth=depth+1,rootId="composition:"+g.id;
 nodes.push({id:rootId,kind:"composition",childIds:[rootChild],instanceIds:ordered.map(x=>x.id),sourceIds:g.sourceIds,confidence:g.confidence,depth:rootDepth});
 return {rootId,nodes,maxDepth:rootDepth,instanceCount:ordered.length};
}
