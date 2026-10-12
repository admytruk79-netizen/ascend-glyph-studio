import {assertMotifGraph,identityMotifTransform,type MotifGraph} from './motif-graph';
import {reconstructMotif,measureMotifStructure} from './motif-reconstruction';
import {measureMotifClearance} from './motif-clearance';
export type MotifRegionLayout={id:string;widthMm:number;heightMm:number;columns:number;rows:number;gapMm:number;marginMm:number;mirrorAlternateRows?:boolean};
/** Deterministic, uniform reference layout. Does not authorize manufacturing,
 * infer historical repeat grammar, or relabel observed contours as ASCEND glyphs. */
export function layoutReferenceMotifRegion(input:MotifGraph,layout:MotifRegionLayout){
 assertMotifGraph(input);
 const sourceStructure=measureMotifStructure(input),sourceClearance=measureMotifClearance(input);
 if(sourceStructure.brokenJunctions||sourceStructure.brokenRepeats||sourceStructure.negativeSpaceViolations
  ||sourceClearance.portsOffPath.length||sourceClearance.outsideEnvelope.length||sourceClearance.clearanceViolations.length)
  throw new Error('motif-region:invalid-reference');
 const {widthMm,heightMm,columns,rows,gapMm,marginMm}=layout;
 if(!/^[A-Za-z][A-Za-z0-9.-]*$/.test(layout.id)||![widthMm,heightMm,gapMm,marginMm].every(Number.isFinite)
  ||widthMm<=0||heightMm<=0||gapMm<=0||marginMm<0||!Number.isInteger(columns)||!Number.isInteger(rows)
  ||columns<1||rows<1||columns*rows>32||layout.mirrorAlternateRows!==undefined&&typeof layout.mirrorAlternateRows!=='boolean')throw new Error('motif-region:layout');
 const points=reconstructMotif(input).flatMap(o=>o.kind==='fill'?o.polygon:o.path);
 for(const r of input.negativeSpace)points.push({x:r.xMm,y:r.yMm},{x:r.xMm+r.widthMm,y:r.yMm+r.heightMm});
 if(!points.length)throw new Error('motif-region:empty-reference');
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
 const cellWidth=(widthMm-2*marginMm-(columns-1)*gapMm)/columns;
 const cellHeight=(heightMm-2*marginMm-(rows-1)*gapMm)/rows;
 if(cellWidth<=0||cellHeight<=0||maxX<=minX||maxY<=minY)throw new Error('motif-region:field-too-small');
 const scale=Math.min(cellWidth/(maxX-minX),cellHeight/(maxY-minY));
 if(!Number.isFinite(scale)||scale<=0)throw new Error('motif-region:scale');
 const motifWidth=(maxX-minX)*scale,motifHeight=(maxY-minY)*scale;
 const p=input.provenance[0],base={provenanceId:p.id,confidence:p.confidence,evidence:['authored reference grid; not historical repeat inference'],transform:identityMotifTransform()};
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:`${input.seed}:${layout.id}`,widthMm,heightMm,
  minGapMm:input.minGapMm,provenance:structuredClone(input.provenance),negativeSpace:[],relations:[],nodes:[
   {...structuredClone(base),id:'composition',kind:'composition'},
   {...structuredClone(base),id:'region',kind:'region',parentId:'composition'}]};
 const placements:{id:string;xMm:number;yMm:number;widthMm:number;heightMm:number;reflected:boolean}[]=[];
 const byRow:string[][]=[];
 for(let row=0;row<rows;row++){
  byRow[row]=[];
  for(let col=0;col<columns;col++){
   const id=`tile-${row}-${col}`,prefix=(nodeId:string)=>`${id}:${nodeId}`;
   const xMm=marginMm+col*(cellWidth+gapMm)+(cellWidth-motifWidth)/2;
   const yMm=marginMm+row*(cellHeight+gapMm)+(cellHeight-motifHeight)/2;
   const reflected=!!layout.mirrorAlternateRows&&row%2===1;
   placements.push({id,xMm,yMm,widthMm:motifWidth,heightMm:motifHeight,reflected});byRow[row].push(id);
   graph.nodes.push({...structuredClone(base),id,kind:'assembly',parentId:'region',
    transform:{...identityMotifTransform(),xMm,yMm}});
   const fitId=`${id}:reference-fit`;
   if(input.nodes.some(n=>prefix(n.id)===fitId))throw new Error('motif-region:id-collision');
   graph.nodes.push({...structuredClone(base),id:fitId,kind:'assembly',parentId:id,
    transform:{...identityMotifTransform(),xMm:(reflected?maxX:-minX)*scale,yMm:-minY*scale,scaleX:scale,scaleY:scale,reflectX:reflected}});
   for(const sourceNode of input.nodes){
    const n=structuredClone(sourceNode);n.id=prefix(n.id);
    n.parentId=sourceNode.parentId?prefix(sourceNode.parentId):fitId;
    if(n.kind==='composition'||n.kind==='region')n.kind='assembly';
    graph.nodes.push(n);
   }
   for(const sourceRelation of input.relations){
    const r=structuredClone(sourceRelation);
    if(r.kind==='repeat'){r.members=r.members.map(prefix);r.stepMm={x:r.stepMm.x*scale*(reflected?-1:1),y:r.stepMm.y*scale};r.toleranceMm*=scale;}
    else {r.from=prefix(r.from);r.to=prefix(r.to);if(r.kind==='junction')r.toleranceMm*=scale;}
    graph.relations.push(r);
   }
   for(const r of input.negativeSpace)graph.negativeSpace.push({xMm:xMm+(reflected?maxX-r.xMm-r.widthMm:r.xMm-minX)*scale,yMm:yMm+(r.yMm-minY)*scale,widthMm:r.widthMm*scale,heightMm:r.heightMm*scale});
  }
  if(columns>1)graph.relations.push({kind:'repeat',members:byRow[row],stepMm:{x:cellWidth+gapMm,y:0},toleranceMm:1e-8});
 }
 const stride=layout.mirrorAlternateRows?2:1;
 for(let parity=0;parity<stride;parity++)for(let col=0;col<columns;col++){
  const members=byRow.filter((_,i)=>i%stride===parity).map(r=>r[col]);
  if(members.length>1)graph.relations.push({kind:'repeat',members,stepMm:{x:0,y:stride*(cellHeight+gapMm)},toleranceMm:1e-8});
 }
 graph.provenance.forEach(p=>p.transformations.push({operation:'authored garment-region reference layout',evidence:`${JSON.stringify(layout)}; uniform scale ${scale}; grid repeats are authored, not inferred historical grammar; no physical calibration`}));
 assertMotifGraph(graph);
 const structure=measureMotifStructure(graph),clearance=measureMotifClearance(graph);
 if(structure.brokenJunctions||structure.brokenRepeats||structure.negativeSpaceViolations||clearance.portsOffPath.length
  ||clearance.outsideEnvelope.length||clearance.clearanceViolations.length)throw new Error('motif-region:reference-constraints');
 return {graph,placements,scale,structure,clearance,productionApproved:false as const};
}
