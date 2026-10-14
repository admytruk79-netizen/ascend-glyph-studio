import {assertMotifGraph,identityMotifTransform,transformMotifPoint,type MotifGraph,type MotifProvenance,type MotifNode} from './motif-graph';
import {reconstructMotif,measureMotifStructure} from './motif-reconstruction';
type Point={x:number;y:number};
type Port={ownerId:string;point:Point};
export type MotifPart={id:string;kind:'flower'|'leaf'|'border';sourceId:string;width:number;height:number;crop:{left:number;top:number;width:number;height:number};
 layers:{color:string;graph:MotifGraph;foregroundPixels:number}[];ports:{base:Port;left:Port;right:Port};segmentationReview:string;maskRoundtripExact:boolean};
export type MotifPartLibrary={schema:'ascend.motif-part-library.v1';pieces:MotifPart[]};
export function composeDetailedMotifParts(library:MotifPartLibrary,input:{widthMm:number;heightMm:number;complexity:number;family:'floral'|'geometric';seed:number}){
 const {widthMm:w,heightMm:h,complexity:c,seed}=input;
 if(library.schema!=='ascend.motif-part-library.v1'||!library.pieces.length)throw Error('motif-parts:library');
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(c)||c<0||c>1||!Number.isSafeInteger(seed)||seed<0||seed>1000000||input.family!=='floral')throw Error('motif-parts:input');
 const onPath=(paths:Point[][],p:Point)=>paths.some(path=>path.slice(1).some((b,i)=>{const a=path[i]!,dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<1e-6;}));
 const ids=new Set<string>();
 for(const piece of library.pieces){
  if(!/^[a-z0-9-]+$/.test(piece.id)||ids.has(piece.id)||!['flower','leaf','border'].includes(piece.kind)||![piece.width,piece.height].every(v=>Number.isFinite(v)&&v>0)||!piece.layers.length||!piece.maskRoundtripExact)throw Error('motif-parts:piece');ids.add(piece.id);
  for(const layer of piece.layers){assertMotifGraph(layer.graph);if(!/^#[0-9a-fA-F]{6}$/.test(layer.color)||layer.graph.widthMm!==piece.width||layer.graph.heightMm!==piece.height||layer.graph.provenance.some(p=>p.id!==piece.sourceId))throw Error('motif-parts:layer');
   if(layer.graph.relations.length||layer.graph.negativeSpace.length||layer.graph.nodes.some(n=>Object.entries(identityMotifTransform()).some(([k,v])=>n.transform[k as keyof typeof n.transform]!==v)))throw Error('motif-parts:source-transform');
   for(const node of layer.graph.nodes)for(const path of node.geometry?.paths??[])if(path.length<4||path[0]!.x!==path.at(-1)!.x||path[0]!.y!==path.at(-1)!.y||path.some(p=>p.x<0||p.y<0||p.x>piece.width||p.y>piece.height))throw Error('motif-parts:source-envelope');
  }
  for(const port of Object.values(piece.ports)){const index=Number(port.ownerId.replace('layer-','')),layer=piece.layers[index];if(!/^layer-\d+$/.test(port.ownerId)||!layer||!onPath(layer.graph.nodes.flatMap(n=>n.geometry?.paths??[]),port.point))throw Error('motif-parts:port-off-path');}
 }
 const get=(kind:MotifPart['kind'])=>{const parts=library.pieces.filter(p=>p.kind===kind);if(!parts.length)throw Error(`motif-parts:missing-${kind}`);return parts;};
 const flowers=get('flower'),leaves=get('leaf'),borders=get('border');let state=Math.imul(seed+1,2654435761)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const sources=new Map<string,MotifProvenance>();
 const graph:MotifGraph={schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed:`detailed-parts-${seed}`,widthMm:w,heightMm:h,minGapMm:0,provenance:[],nodes:[],relations:[],negativeSpace:[]};
 const first=library.pieces[0]!.layers[0]!.graph.provenance[0]!;
 const base=(provenanceId:string,evidence:string)=>({provenanceId,confidence:.7,evidence:[evidence],transform:identityMotifTransform()});
 graph.nodes.push({...base(first.id,'authored arrangement of attributed historical motif parts'),id:'composition',kind:'composition'},
  {...base(first.id,'new branching field'),id:'field',kind:'region',parentId:'composition'});
 const colours=new Map<string,string>();
 const placements:{id:string;partId:string;kind:string;xMm:number;yMm:number;widthMm:number;heightMm:number;rotationDeg:number;scale:number;reflected:boolean;bounds:{minX:number;minY:number;maxX:number;maxY:number}}[]=[];
 type Anchor={ownerId:string;port:string;point:Point};
 const place=(piece:MotifPart,id:string,cx:number,cy:number,maxWidth:number,maxHeight:number,angle=0,reflect=false)=>{
  const p=piece.layers[0]!.graph.provenance[0]!;if(!sources.has(p.id)){const clone=structuredClone(p);clone.transformations.push({operation:'connected motif-part arrangement',evidence:`seed ${seed}; source contours unchanged; uniform fit/reference rotation/reflection; authored connections`});sources.set(p.id,clone);}
  const scale=Math.min(maxWidth/piece.width,maxHeight/piece.height),assembly=`part:${id}`,origin=`origin:${id}`;
  graph.nodes.push({...base(p.id,`part ${piece.id}; ${piece.kind}; draft segmentation`),id:assembly,kind:'assembly',parentId:'field',transform:{...identityMotifTransform(),xMm:cx,yMm:cy,scaleX:scale,scaleY:scale,rotationDeg:angle,reflectX:reflect}},
   {...base(p.id,'source centre normalization'),id:origin,kind:'assembly',parentId:assembly,transform:{...identityMotifTransform(),xMm:-piece.width/2,yMm:-piece.height/2}});
  piece.layers.forEach((layer,j)=>{const node:MotifNode={...base(p.id,`source colour layer; ${piece.id}`),id:`${id}:layer-${j}`,kind:'element',parentId:origin,geometry:{namespace:'reference',paths:structuredClone(layer.graph.nodes.flatMap(n=>n.geometry?.paths??[])),ports:{}}};
   for(const [name,port] of Object.entries(piece.ports))if(port.ownerId===`layer-${j}`)node.geometry!.ports[name]={...port.point};graph.nodes.push(node);colours.set(node.id,layer.color);
  });
  const corners=[{x:0,y:0},{x:piece.width,y:0},{x:piece.width,y:piece.height},{x:0,y:piece.height}].map(p=>transformMotifPoint(graph,origin,p));
  const bounds={minX:Math.min(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxX:Math.max(...corners.map(p=>p.x)),maxY:Math.max(...corners.map(p=>p.y))};
  placements.push({id,partId:piece.id,kind:piece.kind,xMm:cx,yMm:cy,widthMm:piece.width*scale,heightMm:piece.height*scale,rotationDeg:angle,scale,reflected:reflect,bounds});
  return Object.fromEntries(Object.entries(piece.ports).map(([name,port])=>{const ownerId=`${id}:${port.ownerId}`;return [name,{ownerId,port:name,point:transformMotifPoint(graph,ownerId,port.point)}];})) as Record<'base'|'left'|'right',Anchor>;
 };
 const addLine=(id:string,path:Point[],ports:Record<string,Point>,color='#665039')=>{
  const ownerId=`line:${id}`;graph.nodes.push({...base(first.id,'authored connector, not a copied historical stem'),id:`line-assembly:${id}`,kind:'assembly',parentId:'field'},
   {...base(first.id,'explicit connector centreline'),id:ownerId,kind:'element',parentId:`line-assembly:${id}`,geometry:{namespace:'reference',paths:[path],ports}});colours.set(ownerId,color);
  return (name:string):Anchor=>({ownerId,port:name,point:ports[name]!});
 };
 const join=(a:Anchor,b:Anchor)=>graph.relations.push({kind:'junction',from:a.ownerId,fromPort:a.port,to:b.ownerId,toPort:b.port,toleranceMm:1e-7});
 const curve=(a:Point,b:Point,lift:number)=>Array.from({length:13},(_,i)=>{const t=i/12,u=1-t,m={x:(a.x+b.x)/2,y:Math.max(a.y,b.y)+lift};return {x:u*u*a.x+2*u*t*m.x+t*t*b.x,y:u*u*a.y+2*u*t*m.y+t*t*b.y};});
 const connect=(id:string,a:Anchor,b:Anchor,lift=.7)=>{const line=addLine(id,curve(a.point,b.point,lift),{start:a.point,end:b.point});join(a,line('start'));join(line('end'),b);};
 const flowerOrder=[...flowers];for(let i=flowerOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[flowerOrder[i],flowerOrder[j]]=[flowerOrder[j]!,flowerOrder[i]!];}
 let flowerIndex=0;const nextFlower=()=>flowerOrder[flowerIndex++%flowerOrder.length]!;
 const pick=<T>(items:T[])=>items[Math.floor(random()*items.length)]!;
 const columns=2+Math.round(c*2),cell=(w-8)/columns,roots:Anchor[]=[];
 for(let col=0;col<columns;col++){
  const x=4+(col+.5)*cell,head=place(nextFlower(),`main-${col}`,x,h*.31,cell*.43,h*.27);
  const root={x,y:h*.845},branches={x,y:h*.69},leaf1={x,y:h*.76},leaf2={x,y:h*.81};
  const stem=addLine(`stem-${col}`,[head.base.point,{x,y:head.base.point.y+1},{x,y:h*.64},branches,leaf1,leaf2,root],{head:head.base.point,branch:branches,leaf1,leaf2,root});join(head.base,stem('head'));roots.push(stem('root'));
  for(const side of [-1,1]){
   const bud=place(nextFlower(),`bud-${col}-${side<0?'l':'r'}`,x+side*cell*.33,h*.52,cell*.25,h*.18,side*5);
   connect(`bud-branch-${col}-${side}`,stem('branch'),bud.base);
   const leaf=place(pick(leaves),`leaf-${col}-${side<0?'l':'r'}`,x+side*cell*.18,h*.73,cell*.13,h*.14,side*40,side<0);
   connect(`leaf-branch-${col}-${side}`,stem('leaf1'),leaf.base);
   const small=place(pick(leaves),`small-leaf-${col}-${side<0?'l':'r'}`,x+side*cell*.045,h*.80,cell*.065,h*.07,side*45,side<0);
   connect(`small-leaf-branch-${col}-${side}`,stem('leaf2'),small.base,.2);
  }
 }
 const carrierPath=[{x:3,y:h*.845},...roots.map(r=>r.point),{x:w-3,y:h*.845}],carrier=addLine('main-carrier',carrierPath,Object.fromEntries(roots.map((r,i)=>[`root-${i}`,r.point])));
 roots.forEach((r,i)=>join(r,carrier(`root-${i}`)));
 for(const [row,cy] of [['upper',h*.115],['lower',h*.95]] as const){
  const count=Math.max(2,Math.ceil((w-6)/(h*.09*3.55+1))),slot=(w-6)/count;let previous:Record<'base'|'left'|'right',Anchor>|undefined;
  for(let i=0;i<count;i++){const part=place(borders[(i+seed)%borders.length]!,`${row}-${i}`,3+(i+.5)*slot,cy,slot-1,h*.09);if(previous)connect(`${row}-join-${i}`,previous.right,part.left,0);previous=part;}
 }
 for(const [row,cy] of [['upper-seeds',h*.032],['lower-seeds',h*.88]] as const){const count=columns*3,slot=(w-6)/count;for(let i=0;i<count;i++)place(flowers[(i+seed)%flowers.length]!,`${row}-${i}`,3+(i+.5)*slot,cy,slot*.24,h*.038);}
 const overlapping=(a:typeof placements[number],b:typeof placements[number])=>a.bounds.minX<b.bounds.maxX&&b.bounds.minX<a.bounds.maxX&&a.bounds.minY<b.bounds.maxY&&b.bounds.minY<a.bounds.maxY;
 const leafFlowerOverlaps=placements.filter(p=>p.kind==='leaf').flatMap(leaf=>placements.filter(p=>p.kind==='flower'&&overlapping(leaf,p)).map(flower=>({leaf:leaf.id,flower:flower.id})));
 if(leafFlowerOverlaps.length)throw Error('motif-parts:leaf-over-flower');
 graph.provenance=[...sources.values()];if(!sources.has(first.id))graph.provenance.push(structuredClone(first));assertMotifGraph(graph);
 const structure=measureMotifStructure(graph);if(structure.brokenJunctions)throw Error('motif-parts:broken-junction');
 const ir=reconstructMotif(graph),grouped=new Map<string,{closed:boolean;paths:string[]}>();let outsideEnvelope=0;
 for(const object of ir){const path=object.kind==='fill'?object.polygon:object.path,id=object.id.slice(0,object.id.lastIndexOf(':p')),closed=path.length>3&&Math.hypot(path[0]!.x-path.at(-1)!.x,path[0]!.y-path.at(-1)!.y)<1e-7;
  if(path.some(p=>p.x<0||p.y<0||p.x>w||p.y>h))outsideEnvelope++;
  if(closed)continue;
  const group=grouped.get(id)??{closed,paths:[]};group.paths.push(path.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join(' ')+(closed?' Z':''));grouped.set(id,group);
 }
 if(outsideEnvelope)throw Error('motif-parts:outside-envelope');
 const render=(closed:boolean)=>[...grouped].filter(([,g])=>g.closed===closed).map(([id,g])=>`<path data-part-id="${id}" d="${g.paths.join(' ')}" fill="${closed?colours.get(id):'none'}" fill-rule="evenodd" stroke="${closed?'none':colours.get(id)}" stroke-width=".45" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
 const definitions=library.pieces.map(piece=>`<g id="source-${piece.id}">${piece.layers.map(layer=>`<path fill="${layer.color}" fill-rule="evenodd" d="${layer.graph.nodes.flatMap(n=>n.geometry?.paths??[]).map(path=>path.map((p,i)=>`${i?'L':'M'}${Number(p.x.toFixed(4))} ${Number(p.y.toFixed(4))}`).join(' ')+' Z').join(' ')}"/>`).join('')}</g>`).join('');
 const instances=placements.map(p=>{const part=library.pieces.find(piece=>piece.id===p.partId)!;return `<use data-motif-instance="${p.id}" href="#source-${p.partId}" transform="translate(${p.xMm} ${p.yMm}) rotate(${p.rotationDeg}) scale(${p.reflected?-p.scale:p.scale} ${p.scale}) translate(${-part.width/2} ${-part.height/2})"/>`;}).join('');
 const xml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const metadata=xml(JSON.stringify({state:'REFERENCE',method:'New connected source-part composition',sources:graph.provenance.map(p=>({id:p.id,source:p.source,creator:p.creator,culturalContext:p.culturalContext,permission:p.permission})),segmentationReview:'draft',stitchCount:null,productionApproved:false}));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-design-state="detailed-motif-parts"><metadata>${metadata}</metadata><defs>${definitions}</defs><rect width="${w}" height="${h}" fill="#f5efe3"/>${render(false)}${instances}</svg>`;
 return {graph,svg,input:{...input},columns,placements,structure,checks:{leafFlowerOverlaps,outsideEnvelope},stitchCount:null,physicalCalibration:null,sourceImagesEmbedded:false,learnedModelApplied:false,productionApproved:false as const};
}
