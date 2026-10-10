import type {CulturalAccess} from './dimensions';
import type {StitchIrPoint} from './production-stitch-ir';

export type MotifProvenance = {
 id:string; source:string; creator:string|null; community:string|null; culturalContext:string;
 retrievedAt:string; originalSha256:string;
 permission:{status:'verified'|'unknown'|'restricted'; evidence:string; purposes:('analysis'|'reconstruction')[]};
 access:CulturalAccess; confidence:number;
 transformations:{operation:string; evidence:string}[];
};
export type MotifTransform = {xMm:number;yMm:number;rotationDeg:number;scaleX:number;scaleY:number;reflectX:boolean};
export type MotifNode = {
 id:string; parentId?:string; kind:'composition'|'region'|'assembly'|'element';
 provenanceId:string; confidence:number; evidence:string[]; transform:MotifTransform;
 /** Observed reference geometry is never a canonical ASCEND glyph. */
 geometry?:{namespace:'reference'; paths:StitchIrPoint[][]; ports:Record<string,StitchIrPoint>};
};
export type MotifRelation =
 |{kind:'junction';from:string;fromPort:string;to:string;toPort:string;toleranceMm:number}
 |{kind:'repeat';members:string[];stepMm:StitchIrPoint;toleranceMm:number}
 |{kind:'nest';from:string;to:string};
export type MotifGraph = {
 schema:'ascend.motif-graph.v1'; state:'REFERENCE'; units:'mm'; seed:string;
 widthMm:number;heightMm:number; minGapMm:number;
 provenance:MotifProvenance[]; nodes:MotifNode[]; relations:MotifRelation[];
 negativeSpace:{xMm:number;yMm:number;widthMm:number;heightMm:number}[];
};
export const identityMotifTransform = ():MotifTransform=>({xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,reflectX:false});
const finite=(...v:number[])=>v.every(Number.isFinite);
export function assertMotifGraph(g:MotifGraph):void {
 const fail=(s:string):never=>{throw new Error('motif-graph:'+s);};
 if(g.schema!=='ascend.motif-graph.v1'||g.state!=='REFERENCE'||g.units!=='mm'||!g.seed)fail('schema');
 if(!finite(g.widthMm,g.heightMm,g.minGapMm)||g.widthMm<=0||g.heightMm<=0||g.minGapMm<0)fail('dimensions');
 const sources=new Map(g.provenance.map(p=>[p.id,p]));
 if(sources.size!==g.provenance.length)fail('duplicate-provenance');
 for(const p of g.provenance){
  if(!p.id||!p.source||!p.culturalContext||!Number.isFinite(Date.parse(p.retrievedAt))||! /^[a-f0-9]{64}$/.test(p.originalSha256))fail('provenance');
  if(!finite(p.confidence)||p.confidence<0||p.confidence>1)fail('provenance-confidence');
  if(p.permission.status!=='verified'||!p.permission.evidence||!['analysis','reconstruction'].every(k=>p.permission.purposes.includes(k as 'analysis'|'reconstruction')))fail('permission');
  if(p.access!=='structural-public'&&p.access!=='documented-public')fail('cultural-access');
  if(p.transformations.some(t=>!t.operation||!t.evidence))fail('transformation-evidence');
 }
 const nodes=new Map(g.nodes.map(n=>[n.id,n]));
 if(nodes.size!==g.nodes.length||g.nodes.filter(n=>n.kind==='composition').length!==1)fail('hierarchy-root');
 for(const n of g.nodes){
  if(!n.id||!sources.has(n.provenanceId)||!n.evidence.length||n.evidence.some(e=>!e)||!finite(n.confidence)||n.confidence<0||n.confidence>1)fail('node-evidence');
  const t=n.transform;
  if(!finite(t.xMm,t.yMm,t.rotationDeg,t.scaleX,t.scaleY)||t.scaleX<=0||t.scaleY<=0)fail('transform');
  if(n.kind==='composition'?n.parentId!==undefined:!n.parentId||!nodes.has(n.parentId))fail('parent');
  const seen=new Set<string>();let cursor:MotifNode|undefined=n;
  while(cursor){if(seen.has(cursor.id))fail('hierarchy-cycle');seen.add(cursor.id);cursor=cursor.parentId?nodes.get(cursor.parentId):undefined;}
  if(n.kind==='element'&&!n.geometry)fail('element-geometry');
  if(n.geometry){if(n.kind!=='element'||n.geometry.namespace!=='reference'||!n.geometry.paths.length)fail('reference-geometry');
   for(const path of n.geometry.paths)if(path.length<2||path.some(p=>!finite(p.x,p.y)))fail('path');
   if(Object.values(n.geometry.ports).some(p=>!finite(p.x,p.y)))fail('port');
  }
 }
 for(const r of g.relations){
  if(r.kind==='repeat'){if(r.members.length<2||new Set(r.members).size!==r.members.length||r.members.some(id=>!nodes.has(id))||!finite(r.stepMm.x,r.stepMm.y,r.toleranceMm)||r.toleranceMm<0)fail('repeat');}
  else {if(!nodes.has(r.from)||!nodes.has(r.to)||r.from===r.to)fail('relation-endpoint');
   if(r.kind==='junction'&&(!nodes.get(r.from)?.geometry?.ports[r.fromPort]||!nodes.get(r.to)?.geometry?.ports[r.toPort]||!finite(r.toleranceMm)||r.toleranceMm<0))fail('junction-port');
   if(r.kind==='nest'){let p=nodes.get(r.to)?.parentId;while(p&&p!==r.from)p=nodes.get(p)?.parentId;if(p!==r.from)fail('nest-ancestry');}
  }
 }
 for(const r of g.negativeSpace)if(!finite(r.xMm,r.yMm,r.widthMm,r.heightMm)||r.xMm<0||r.yMm<0||r.widthMm<=0||r.heightMm<=0||r.xMm+r.widthMm>g.widthMm||r.yMm+r.heightMm>g.heightMm)fail('negative-space');
}
export function transformMotifPoint(g:MotifGraph,nodeId:string,p:StitchIrPoint):StitchIrPoint {
 const nodes=new Map(g.nodes.map(n=>[n.id,n]));let n=nodes.get(nodeId);if(!n)throw new Error('unknown motif node');
 let out={...p};const seen=new Set<string>();
 while(n){if(seen.has(n.id))throw new Error('motif hierarchy cycle');seen.add(n.id);
  const t=n.transform,a=t.rotationDeg*Math.PI/180,x=out.x*t.scaleX*(t.reflectX?-1:1),y=out.y*t.scaleY;
  out={x:t.xMm+x*Math.cos(a)-y*Math.sin(a),y:t.yMm+x*Math.sin(a)+y*Math.cos(a)};n=n.parentId?nodes.get(n.parentId):undefined;
 }
 return out;
}
