import {assertMotifGraph,identityMotifTransform,type MotifGraph,type MotifNode} from './motif-graph';
import {reconstructMotif} from './motif-reconstruction';
export type MotifFragment={id:string;role:'bouquet'|'branch'|'border';sourceId:string;width:number;height:number;
 crop:{left:number;top:number;width:number;height:number};layers:{color:string;graph:MotifGraph;foregroundPixels:number}[];
 leftEdge:number[];rightEdge:number[];segmentationReview:string;maskRoundtripExact:boolean};
export type MotifFragmentLibrary={schema:'ascend.source-fragment-library.v1';fragments:MotifFragment[]};
export type JigsawInput={widthMm:number;heightMm:number;complexity:number;family:'floral'|'geometric';seed:number};
/** Source-fragment assembly. Role constraints are hard; measured edge similarity
 * is a soft selection score, not a promise of continuous stems or a WFC solver. */
export function assembleMotifFragmentJigsaw(library:MotifFragmentLibrary,input:JigsawInput){
 const {widthMm:w,heightMm:h,complexity:c,seed}=input;
 if(library.schema!=='ascend.source-fragment-library.v1'||!library.fragments.length)throw Error('jigsaw:library');
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(c)||c<0||c>1||!Number.isSafeInteger(seed)||seed<0||seed>1000000||input.family!=='floral')throw Error('jigsaw:input');
 const ids=new Set<string>();
 for(const f of library.fragments){
  if(ids.has(f.id)||! /^[A-Za-z0-9.-]+$/.test(f.id)||!['bouquet','branch','border'].includes(f.role)||!Number.isFinite(f.width)||!Number.isFinite(f.height)||f.width<=0||f.height<=0||!f.layers.length||!f.maskRoundtripExact||f.leftEdge.length!==16||f.rightEdge.length!==16||[...f.leftEdge,...f.rightEdge].some(v=>!Number.isInteger(v)||v< -1||v>4))throw Error('jigsaw:fragment');
  ids.add(f.id);
  for(const l of f.layers){assertMotifGraph(l.graph);if(l.graph.provenance.some(p=>p.id!==f.sourceId)||!/^#[0-9a-fA-F]{6}$/.test(l.color)||l.graph.widthMm!==f.width||l.graph.heightMm!==f.height||l.graph.relations.length||l.graph.negativeSpace.length)throw Error('jigsaw:layer');
   for(const n of l.graph.nodes)for(const path of n.geometry?.paths??[])for(const p of path)if(p.x<0||p.y<0||p.x>f.width||p.y>f.height)throw Error('jigsaw:fragment-envelope');
  }
 }
 let state=Math.imul(seed+1,2654435761)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const columns=3+Math.round(c*2),first=library.fragments[0].layers[0].graph.provenance[0];
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:`source-jigsaw-${seed}`,widthMm:w,heightMm:h,minGapMm:0,
  nodes:[{id:'composition',kind:'composition',provenanceId:`${first.id}:${library.fragments[0].id}`,confidence:first.confidence,evidence:['new arrangement of attributed source fragments'],transform:identityMotifTransform()}],relations:[],negativeSpace:[],provenance:[]};
 const colours=new Map<string,string>(),placements:{id:string;fragmentId:string;role:string;xMm:number;yMm:number;widthMm:number;heightMm:number;reflected:boolean;edgeMismatch:number|null}[]=[];
 const addRow=(role:'bouquet'|'branch'|'border',row:string,y:number,height:number,count:number,mixed=false)=>{
  let previous:{fragment:MotifFragment;reflected:boolean}|undefined;
  for(let col=0;col<count;col++){
   const required=mixed&&col%2?'branch':role;
   const candidates=library.fragments.filter(f=>f.role===required);if(!candidates.length)throw Error(`jigsaw:missing-role:${required}`);
   const ranked=candidates.flatMap(fragment=>[false,true].map(reflected=>{
    const left=reflected?fragment.rightEdge:fragment.leftEdge,right=previous?(previous.reflected?previous.fragment.leftEdge:previous.fragment.rightEdge):null;
    const mismatch=right?left.reduce((n,v,i)=>n+(v===right[i]?0:v<0||right[i]<0?1:.5),0)/16:null;
    return {fragment,reflected,mismatch,score:(mismatch??0)+(previous?.fragment.id===fragment.id ? .8 : 0)+random()*.3};
   })).sort((a,b)=>a.score-b.score);
   const chosen=ranked[0],f=chosen.fragment,id=`${row}-${col}`,slot=(w-6)/count,gap=role==='border'?1:2;
   const available=slot-gap,scale=Math.min(available/f.width,height/f.height),fw=f.width*scale,fh=f.height*scale;
   if(scale<=0)throw Error('jigsaw:field-too-small');
   const x=3+col*slot+(slot-fw)/2,fy=y+(height-fh)/2;
   placements.push({id,fragmentId:f.id,role:f.role,xMm:x,yMm:fy,widthMm:fw,heightMm:fh,reflected:chosen.reflected,edgeMismatch:chosen.mismatch});
   const provenanceId=`${f.layers[0].graph.provenance[0].id}:${f.id}`;
   if(!graph.provenance.some(p=>p.id===provenanceId)){const p=structuredClone(f.layers[0].graph.provenance[0]);p.id=provenanceId;p.transformations.push({operation:'source-fragment jigsaw arrangement',evidence:`seed ${seed}; original paths retained; uniform fit and reference-only reflection; not a new historical attribution`});graph.provenance.push(p);}
   const base={provenanceId,confidence:f.layers[0].graph.provenance[0].confidence,evidence:[`source fragment ${f.id}; crop ${JSON.stringify(f.crop)}; draft colour segmentation`],transform:identityMotifTransform()};
   graph.nodes.push({...base,id:`region-${id}`,kind:'region',parentId:'composition'},
    {...structuredClone(base),id:`piece-${id}`,kind:'assembly',parentId:`region-${id}`,transform:{...identityMotifTransform(),xMm:x+(chosen.reflected?fw:0),yMm:fy,scaleX:scale,scaleY:scale,reflectX:chosen.reflected}});
   f.layers.forEach((l,j)=>{
    for(const n of l.graph.nodes){const copy:MotifNode=structuredClone(n);copy.id=`${id}:colour-${j}:${n.id}`;copy.provenanceId=provenanceId;copy.parentId=n.parentId?`${id}:colour-${j}:${n.parentId}`:`piece-${id}`;
     if(copy.kind==='composition'||copy.kind==='region')copy.kind='assembly';graph.nodes.push(copy);if(copy.geometry)colours.set(copy.id,l.color);
    }
   });
   previous=chosen;
  }
 };
 // Independent compound silhouettes keep flower/leaf relationships inside each piece.
 addRow('border','upper',h*.035,h*.12,columns*2);
 addRow('bouquet','main',h*.20,h*.59,columns,true);
 addRow('border','lower',h*.84,h*.12,columns*2);
 for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){
  const a=placements[i],b=placements[j];if(a.xMm<b.xMm+b.widthMm&&b.xMm<a.xMm+a.widthMm&&a.yMm<b.yMm+b.heightMm&&b.yMm<a.yMm+a.heightMm)throw Error('jigsaw:overlap');
 }
 graph.nodes[0].provenanceId=graph.provenance[0].id;
 assertMotifGraph(graph);
 const ir=reconstructMotif(graph),paths=new Map<string,string[]>();let outsideEnvelope=0;
 for(const object of ir){if(object.kind!=='run')throw Error('jigsaw:unexpected-ir');const nodeId=object.id.slice(0,object.id.lastIndexOf(':p'));
  if(object.path.some(p=>p.x<-1e-8||p.y<-1e-8||p.x>w+1e-8||p.y>h+1e-8))outsideEnvelope++;
  const d=object.path.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join(' ')+' Z';paths.set(nodeId,[...(paths.get(nodeId)??[]),d]);
 }
 if(outsideEnvelope)throw Error('jigsaw:outside-envelope');
 const body=[...paths].map(([id,d])=>`<path data-fragment-part="${id}" fill="${colours.get(id)}" fill-rule="evenodd" d="${d.join(' ')}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-design-state="source-fragment-jigsaw"><metadata>Attributed source-fragment remix; exact draft segmentation contours; not trained generation or machine digitization.</metadata><rect width="${w}" height="${h}" fill="#f5efe3"/>${body}</svg>`;
 return {graph,svg,input:{...input},columns,placements,elementCount:graph.nodes.filter(n=>n.kind==='element').length,
  checks:{overlappingPieceFootprints:0,outsideEnvelope},sourceImagesEmbedded:false,learnedModelApplied:false,canonicalGeometryChanged:false,
  historicalShapesReused:true,physicalCalibration:null,stitchCount:null,productionApproved:false as const};
}
