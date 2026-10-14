import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from './motif-observed-annotations';
import {assertMotifGraph,identityMotifTransform,type MotifNode} from './motif-graph';
export type ObservedField={id:string;boxPx:{x:number;y:number;width:number;height:number};elementIds:string[];evidence:string};
export type ObservedFieldAnnotations={schema:'ascend.observed-motif-fields.v1';fields:ObservedField[];
 protectedSpaces:{boxPx:ObservedField['boxPx'];evidence:string}[]};
/** Explicit image-space layout annotations. Empty fields are untraced regions,
 * not inferred motifs. Reference scaling never establishes physical dimensions. */
export function graphFromObservedFields(a:ObservedMotifAnnotations,layout:ObservedFieldAnnotations,referenceWidthMm=100){
 const fail=():never=>{throw new Error('motif-fields:invalid-layout');};
 if(layout.schema!=='ascend.observed-motif-fields.v1'||!layout.fields.length)fail();
 const boxes=[...layout.fields,...layout.protectedSpaces];
 for(const f of boxes){const b=f.boxPx;if(!f.evidence?.trim()||![b.x,b.y,b.width,b.height].every(Number.isFinite)
  ||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>a.image.width||b.y+b.height>a.image.height)fail();}
 const overlap=(a:ObservedField['boxPx'],b:ObservedField['boxPx'])=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
 for(let i=0;i<layout.fields.length;i++){
  for(let j=i+1;j<layout.fields.length;j++)if(overlap(layout.fields[i].boxPx,layout.fields[j].boxPx))fail();
  if(layout.protectedSpaces.some(p=>overlap(p.boxPx,layout.fields[i].boxPx)))fail();
 }
 const ids=new Set<string>(),assignment=new Map<string,ObservedField>();
 for(const f of layout.fields){
  if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(f.id)||ids.has(f.id))fail();ids.add(f.id);
  for(const id of f.elementIds){if(assignment.has(id)||!a.elements.some(e=>e.id===id))fail();assignment.set(id,f);}
 }
 for(const e of a.elements){
  const f=assignment.get(e.id);if(!f)fail();const b=f!.boxPx;
  if(e.parentElementId&&assignment.get(e.parentElementId)!==f)fail();
  if(e.paths.flat().some(([x,y])=>x<b.x||x>b.x+b.width||y<b.y||y>b.y+b.height))fail();
 }
 const graph=graphFromObservedAnnotations(a,referenceWidthMm),scale=referenceWidthMm/a.image.width;
 graph.nodes=graph.nodes.filter(n=>n.id!=='field');
 for(const f of layout.fields){
  const node:MotifNode={id:`field:${f.id}`,parentId:'composition',kind:'region',provenanceId:a.provenance.id,
   confidence:a.provenance.confidence,evidence:[f.evidence,`Draft source field box pixels: ${JSON.stringify(f.boxPx)}; ${f.elementIds.length?'partial observed contours':'no contours reconstructed'}`],transform:identityMotifTransform()};
  graph.nodes.push(node);
 }
 for(const e of a.elements)if(e.parentElementId===null){
  graph.nodes.find(n=>n.id===`assembly:${e.id}`)!.parentId=`field:${assignment.get(e.id)!.id}`;
 }
 graph.negativeSpace=layout.protectedSpaces.map(p=>({xMm:p.boxPx.x*scale,yMm:p.boxPx.y*scale,widthMm:p.boxPx.width*scale,heightMm:p.boxPx.height*scale}));
 graph.provenance[0].transformations.push({operation:'manual field decomposition',evidence:layout.fields.map(f=>`${f.id}: ${f.evidence}`).concat(layout.protectedSpaces.map(p=>p.evidence)).join('; ')});
 assertMotifGraph(graph);return graph;
}
