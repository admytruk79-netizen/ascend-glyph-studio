import {assertMotifGraph,identityMotifTransform,transformMotifPoint,type MotifGraph,type MotifNode} from './motif-graph';
import {assertObservedContainment} from './motif-containment';
import {composeReferenceMotifFields,type MotifCompositionField} from './motif-composition-layout';
import {decomposeAnnotatedMotif,reconstructMotif,measureMotifStructure} from './motif-reconstruction';
import {measureMotifClearance} from './motif-clearance';

export const ORIGINAL_GRAMMAR_SOURCE='ASCEND authored composition grammar v1: seeded lobed heads, nested cores, explicit stem and leaf junctions, independently fitted cells and four border fields; no historical paths or image pixels.';
type Point={x:number;y:number};
function authoredUnit(seed:number,family:'floral'|'geometric'){
 let state=Math.imul((seed+1)>>>0,2654435761)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const provenance={schema:'ascend.motif-provenance.v1' as const,id:`authored-${family}-${seed}`,source:'urn:ascend:authored-construction:v1',creator:'Tesseract authored construction grammar',community:null,
  culturalContext:'Contemporary original ornament assembly; visual studies inform construction approaches, not copied historical paths or regional identity.',
  retrievedAt:'2026-10-13T00:00:00Z',originalSha256:'5390d1330d9805f986f45154326a60d7285d6907cb1d199e429f3ccc9af51cd9',
  permission:{status:'verified' as const,evidence:'Procedurally authored geometry. Source hash identifies ORIGINAL_GRAMMAR_SOURCE text; not an original photograph or a museum licence.',purposes:['analysis','reconstruction'] as ('analysis'|'reconstruction')[]},
  access:'structural-public' as const,confidence:.7,regionalAttribution:{status:'unassigned' as const},transformations:[{operation:'seeded authored parts',evidence:`family=${family};seed=${seed}; actual generated coordinates retained in graph`}]};
 const node=(id:string,kind:MotifNode['kind'],parentId?:string):MotifNode=>({id,kind,parentId,provenanceId:provenance.id,confidence:.7,evidence:['authored original construction part; not an observed historical motif'],transform:identityMotifTransform()});
 const g:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:`${family}-${seed}`,widthMm:40,heightMm:50,minGapMm:0,
  provenance:[provenance],nodes:[node('composition','composition'),node('field','region','composition')],relations:[],negativeSpace:[]};
 const add=(id:string,path:Point[],parent?:string,ports:Record<string,Point>={})=>{
  const assembly=node(`assembly:${id}`,'assembly',parent?`assembly:${parent}`:'field'),element=node(`element:${id}`,'element',assembly.id);
  element.geometry={namespace:'reference',paths:[path],ports};g.nodes.push(assembly,element);
  if(parent){const outer=g.nodes.find(n=>n.id===`element:${parent}`)!;assertObservedContainment(outer.geometry!.paths,[path]);g.relations.push({kind:'nest',from:outer.parentId!,to:element.id});}
 };
 const join=(a:string,ap:string,b:string,bp:string)=>g.relations.push({kind:'junction',from:`element:${a}`,fromPort:ap,to:`element:${b}`,toPort:bp,toleranceMm:1e-8});
 const ring=(cx:number,cy:number,radius:number,petals:number,phase:number,amplitude:number)=>{
  const points=Array.from({length:32},(_,i)=>{const angle=i*Math.PI/16,r=radius+amplitude*Math.cos(petals*angle+phase);return {x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)};});
  return [...points,{...points[0]}];
 };
 if(family==='floral'){
  const petals=4+Math.floor(random()*4),phase=random()*Math.PI*2,radius=7.5+random()*1.5,head=ring(20,12,radius,petals,phase,1.2);
  const base=head.reduce((a,b)=>a.y>b.y?a:b),x=base.x;
  add('flower-head',head,undefined,{base});add('flower-inset',ring(20,12,2.8,petals,phase,.5),'flower-head');add('flower-core',ring(20,12,1,4,0,0),'flower-inset');
  for(let i=0;i<petals;i++){
   const angle=(i*Math.PI*2-phase)/petals,cx=20+radius*.65*Math.cos(angle),cy=12+radius*.65*Math.sin(angle),r=.25;
   add(`petal-mark-${i}`,[{x:cx,y:cy-r},{x:cx+r,y:cy},{x:cx,y:cy+r},{x:cx-r,y:cy},{x:cx,y:cy-r}],'flower-head');
  }
  const left={x:14,y:28},right={x:26,y:36};
  add('stem',[base,{x,y:28},{x,y:36},{x,y:47}],undefined,{head:base,left:{x,y:28},right:{x,y:36},root:{x,y:47}});
  add('leaf-left',[left,{x:10,y:25},{x:6,y:28},{x:10,y:31},left],undefined,{tip:left});
  add('leaf-right',[right,{x:30,y:33},{x:34,y:36},{x:30,y:39},right],undefined,{tip:right});
  for(const [side,cx,cy] of [['left',10,28],['right',30,36]] as const){
   add(`leaf-vein-${side}`,[{x:cx,y:cy-1},{x:cx+1.5,y:cy},{x:cx,y:cy+1},{x:cx-1.5,y:cy},{x:cx,y:cy-1}],`leaf-${side}`);
  }
  add('branch-left',[{x,y:28},left],undefined,{stem:{x,y:28},leaf:left});
  add('branch-right',[{x,y:36},right],undefined,{stem:{x,y:36},leaf:right});
  join('flower-head','base','stem','head');join('stem','left','branch-left','stem');join('branch-left','leaf','leaf-left','tip');join('stem','right','branch-right','stem');join('branch-right','leaf','leaf-right','tip');
 }else{
  const radius=12+random()*3,diamond=(r:number)=>[{x:20,y:25-r},{x:20+r,y:25},{x:20,y:25+r},{x:20-r,y:25},{x:20,y:25-r}];
  add('diamond-outer',diamond(radius));add('diamond-inset',diamond(radius*.70),'diamond-outer');
  const phase=random()*Math.PI,star=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8+phase,r=radius*(i%2?.18:.38);return {x:20+r*Math.cos(a),y:25+r*Math.sin(a)};});
  add('star-core',[...star,{...star[0]}],'diamond-inset');
 }
 assertMotifGraph(g);return decomposeAnnotatedMotif(g);
}

/** A newly assembled vector composition through existing Tesseract graph,
 * containment, contact, field-fit and clearance components. Not model fine-tuning. */
export function generateOriginalOrnament(input:{widthMm:number;heightMm:number;complexity:number;family:'floral'|'geometric';seed:number}){
 const {widthMm:w,heightMm:h,complexity:c,seed}=input;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(c)||c<0||c>1||!Number.isSafeInteger(seed)||seed<0||seed>1000000||!['floral','geometric'].includes(input.family))throw new Error('original-composition:invalid-input');
 const columns=3+Math.round(c*4),fields:MotifCompositionField[]=[],usable=w-4,cell=usable/columns;
 for(let i=0;i<columns;i++)fields.push({id:`main-${i}`,xMm:2+i*cell,yMm:h*.22,source:authoredUnit(seed*31+i,input.family),
  layout:{id:`main-fit-${i}`,widthMm:cell-1,heightMm:h*.56,columns:1,rows:1,gapMm:1,marginMm:.5}});
 const borders=[{id:'upper-outer',y:2,height:h*.10,count:columns*2},{id:'upper-inner',y:h*.14+2,height:h*.05,count:columns*3},
  {id:'lower-inner',y:h*.80,height:h*.05,count:columns*3},{id:'lower-outer',y:h*.89,height:h*.08,count:columns*2}];
 for(const b of borders)fields.push({id:b.id,xMm:2,yMm:b.y,source:authoredUnit(seed+100000000,'geometric'),
  layout:{id:`fit-${b.id}`,widthMm:usable,heightMm:b.height,columns:b.count,rows:1,gapMm:.3,marginMm:.2}});
 const result=composeReferenceMotifFields(w,h,fields);
 if(input.family==='floral'){
  const stems=result.graph.nodes.filter(n=>n.kind==='element'&&n.id.includes('main-')&&n.id.endsWith(':element:stem'));
  const roots=stems.map(n=>transformMotifPoint(result.graph,n.id,n.geometry!.ports.root));
  const path=roots.flatMap((p,i)=>i?[{x:(roots[i-1].x+p.x)/2,y:Math.min(roots[i-1].y,p.y)-Math.min(3,h*.025)},p]:[p]);
  const base={provenanceId:result.graph.provenance[0].id,confidence:.7,evidence:['authored root-vine connection between separately generated floral units'],transform:identityMotifTransform()};
  result.graph.nodes.push({...structuredClone(base),id:'root-vine-region',kind:'region',parentId:'composition'},
   {...structuredClone(base),id:'root-vine-assembly',kind:'assembly',parentId:'root-vine-region'},
   {...structuredClone(base),id:'root-vine',kind:'element',parentId:'root-vine-assembly',geometry:{namespace:'reference',paths:[path],ports:Object.fromEntries(roots.map((p,i)=>[`root-${i}`,p]))}});
  stems.forEach((n,i)=>result.graph.relations.push({kind:'junction',from:n.id,fromPort:'root',to:'root-vine',toPort:`root-${i}`,toleranceMm:1e-8}));
  result.graph.provenance[0].transformations.push({operation:'authored connecting vine',evidence:'Root ports joined by a separately generated path; no source-image path copied.'});
  assertMotifGraph(result.graph);result.structure=measureMotifStructure(result.graph);result.clearance=measureMotifClearance(result.graph);
  if(result.structure.brokenJunctions||result.clearance.clearanceViolations.length||result.clearance.outsideEnvelope.length)throw new Error('original-composition:connection-clearance');
 }
 const ir=reconstructMotif(result.graph);
 const closed=(p:Point[])=>p.length>2&&Math.hypot(p[0].x-p.at(-1)!.x,p[0].y-p.at(-1)!.y)<1e-7;
 const paths=ir.map(o=>{
  const p=o.kind==='fill'?o.polygon:o.path,shape=p.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(4)} ${q.y.toFixed(4)}`).join(' ');
  const isClosed=closed(p),inset=o.id.includes('inset'),dark=o.id.includes('leaf-')||o.id.includes('core')||o.id.includes('petal-mark'),vein=o.id.includes('leaf-vein');
  const fill=isClosed?(vein?'#f5efe3':inset?(o.id.includes('flower-inset')?'#bd4150':'#f5efe3'):dark?'#25201e':'#a32032'):'none';
  return `<path data-part-id="${o.id}" d="${shape}${isClosed?' Z':''}" fill="${fill}" stroke="#25201e" stroke-width="${isClosed?.25:.45}" stroke-linejoin="round" stroke-linecap="round"/>`;
 }).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-design-state="original-reference-composition"><metadata>New procedural assembly; no embedded source image; source-study guidance is not a trained model or manufacturing approval.</metadata><rect width="${w}" height="${h}" fill="#f5efe3"/>${paths}</svg>`;
 return {...result,svg,columns,input:{...input},sourceImagesEmbedded:false,learnedModelApplied:false,canonicalGeometryChanged:false,
  constructionGuidance:[{id:'user-imagery-examples',use:'compound floral cells and separated framing bands'},
   {id:'honchar-exhibition-2012',use:'garment placement and cloth-ground study; not medical, symbolic or universal regional rules'}],
  method:'seeded authored parts assembled by existing Tesseract motif components',noveltyAgainstFullCorpusVerified:false,
  physicalCalibration:null,stitchCount:null,productionApproved:false as const};
}
