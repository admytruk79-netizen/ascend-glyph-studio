import {Kit,type Pt} from './folk-rich.ts';
import {inspectAuthoredMotifAssembly} from '../../tesseract-engine/src/learned-motif-runtime.ts';
import {plan,estimateMinutes,runGate,previewSvg,recipes} from '../../stitch-engine/src/index.ts';
import type {MachineTemplate} from '../../tesseract-engine/src/machine-template.ts';
import type {MotifProvenance} from '../../tesseract-engine/src/motif-graph.ts';
import {assertObservedContainment} from '../../tesseract-engine/src/motif-containment.ts';
import {assertMotifGraph} from '../../tesseract-engine/src/motif-graph.ts';
import {measureMotifStructure} from '../../tesseract-engine/src/motif-reconstruction.ts';
import {orderIndependentLayers} from '../../stitch-engine/src/plan.ts';
const red='#a32235',dark='#252020',coral='#cf665c',gold='#b48145';
type Input={widthMm:number;heightMm:number;complexity:number;family:'floral'|'geometric';seed:number};
type Box={id:string;x:number;y:number;r:number};
/** Original compound motifs; source-study construction principles, no traced source paths. */
export function generateCompoundFloral(input:Input,machine?:MachineTemplate){
 const {widthMm:w,heightMm:h,complexity:c,seed}=input;
 if(![w,h,c].every(Number.isFinite)||w<80||w>600||h<40||h>160||c<0||c>1||input.family!=='floral'||!Number.isSafeInteger(seed)||seed<0||seed>1000000)throw Error('compound-floral:invalid-input');
 const k=new Kit('botanical-'),connections:{fromId:string;fromPoint:Pt;toId:string;toPoint:Pt}[]=[],assemblies:{id:string;brick:null;role:string;objectIds:string[]}[]=[];
 const flowerBoxes:Box[]=[],leafBoxes:Box[]=[],nestedCores:{parentId:string;outerId:string;innerIds:string[]}[]=[];
 const unitCount=Math.max(1,Math.floor((w-8)/(h*(.63-c*.10)))),cell=(w-8)/unitCount,scale=Math.min((cell-3)/62,(h*.64)/64);
 const group=(id:string,role:string,draw:()=>void)=>{const start=k.objs.length;draw();assemblies.push({id,brick:null,role,objectIds:k.objs.slice(start).map(o=>o.id)});};
 const path=(kind:string,points:Pt[],width=1)=>{k.satin(kind,dark,k.curve(points),width);return k.objs.at(-1)!;};
 const join=(fromId:string,a:Pt,toId:string,b:Pt)=>connections.push({fromId,fromPoint:a,toId,toPoint:b});
 let previousRoot:{id:string;p:Pt}|undefined;
 for(let u=0;u<unitCount;u++){
  const cx=4+(u+.5)*cell,top=h*.20,p=(x:number,y:number):Pt=>({x:cx+x*scale,y:top+y*scale});
  const flower=(id:string,x:number,y:number,r:number,variant:number)=>{
   const centre=p(x,y),R=r*scale,petals=(variant===0?8:variant===1?6:10)+((Math.imul(seed+u+1,1664525)>>>8)%3)*2;
   let baseId='',coreStart=0;
   group(`${u}-${id}`,'compound-flower',()=>{
    // A scalloped continuous foundation supports the nested, independently angled petals.
    const outline=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,rr=R*(.86+.14*Math.cos(petals*(a-Math.PI/2)));return {x:centre.x+rr*Math.cos(a),y:centre.y+rr*Math.sin(a)};});
    k.fill('flower-foundation',red,outline);baseId=k.objs.at(-1)!.id;
    for(let j=0;j<petals;j++){
     const a=j*2*Math.PI/petals-Math.PI/2,base={x:centre.x+Math.cos(a)*R*.22,y:centre.y+Math.sin(a)*R*.22};
     k.leaf(j%2?coral:red,base,a,R*.70,R*(variant===1?.25:.18),0,.60,'outer-petal');
     if(R>4.5)k.leaf(coral,{x:centre.x+Math.cos(a+Math.PI/petals)*R*.12,y:centre.y+Math.sin(a+Math.PI/petals)*R*.12},a+Math.PI/petals,R*.43,R*.105,0,.55,'inner-petal');
    }
    coreStart=k.objs.length;
    // Two counter-rotated scalloped whorls give the rose form a compound centre.
    if(variant===0&&R>4.5)for(const [radius,color,phase] of [[.57,red,.18+(seed%31)*.02],[.40,coral,-.20-(seed%29)*.02]] as const){
     const ring=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,rr=R*radius*(.87+.13*Math.cos(6*(a+phase)));return {x:centre.x+rr*Math.cos(a),y:centre.y+rr*Math.sin(a)};});k.fill('rose-whorl',color,ring);
    }
    k.disc(dark,centre.x,centre.y,R*.23,'flower-core');
    if(R>5)for(let j=0;j<6;j++){const a=j*Math.PI/3;k.disc(gold,centre.x+R*.13*Math.cos(a),centre.y+R*.13*Math.sin(a),Math.max(.38,R*.045),'pollen');}
   });
   nestedCores.push({parentId:`motif:${u}-${id}`,outerId:baseId,innerIds:k.objs.slice(coreStart).map(o=>o.id)});
   flowerBoxes.push({id:`${u}-${id}`,x:centre.x,y:centre.y,r:R});
   return {id:baseId,p:p(x,y+r)};
  };
  const hero=flower('crown',0,12,9.4+((Math.imul(seed+u+1,1103515245)>>>16)%61)/100,(seed+u)%3),left=flower('left-flower',-21,31,6.5,(seed+u+1)%3),right=flower('right-flower',21,31,6.5,(seed+u+2)%3);
  let trunkId='';const root=p(0,61),fork=p(0,50);
  group(`${u}-branches`,'branch-network',()=>{
   const trunk=path('trunk',[root,fork,p(0,34),hero.p]);trunkId=trunk.id;join(trunk.id,hero.p,hero.id,hero.p);
   for(const [side,head] of [[-1,left],[1,right]] as const){const branch=path('branch',[fork,p(side*12,49),head.p]);join(trunk.id,fork,branch.id,fork);join(branch.id,head.p,head.id,head.p);}
  });
  // Leaves occupy the lower field, clear of all flower envelopes. Each petiole joins the trunk.
  for(const side of [-1,1])for(let row=0;row<2;row++){
   const y=55-row*9,base=p(side*6,y),tip=p(side*(16+row*2),y-2),a=Math.atan2(tip.y-base.y,tip.x-base.x),len=Math.hypot(tip.x-base.x,tip.y-base.y),attach=p(0,y);
   group(`${u}-leaf-${side}-${row}`,'leaf-and-petiole',()=>{
    const petiole=path('petiole',[attach,base],1);join(trunkId,attach,petiole.id,attach);
    k.leaf(dark,base,a,len,2.1*scale,0,.48,'foliage');const leaf=k.objs.at(-1)!;join(petiole.id,base,leaf.id,base);
    if(scale>.6)k.run('leaf-vein',gold,[base,{x:base.x+(tip.x-base.x)*.8,y:base.y+(tip.y-base.y)*.8}]);
   });
   leafBoxes.push({id:`${u}-leaf-${side}-${row}`,x:(base.x+tip.x)/2,y:(base.y+tip.y)/2,r:len/2+2.1*scale});
  }
  for(const side of [-1,1]){
   const base=p(side*23,17),tip=p(side*26,8),a=Math.atan2(tip.y-base.y,tip.x-base.x),size=7*scale,attach=p(side*21,37.5);
   group(`${u}-bud-${side}`,'bud-and-stalk',()=>{
    const stalk=path('bud-stalk',[attach,p(side*30,41),p(side*30,20),base],1);const head=side<0?left:right;join(stalk.id,attach,head.id,attach);
    k.leaf(red,base,a,size,size*.23,0,.62,'bud');join(stalk.id,base,k.objs.at(-1)!.id,base);
    for(const sign of [-1,1])k.leaf(dark,base,a+sign*.48,size*.48,size*.10,0,.45,'bud-sepal');
   });
  }
  group(`${u}-carrier`,'connecting-vine',()=>{if(previousRoot){const vine=path('carrier',[previousRoot.p,{x:(previousRoot.p.x+root.x)/2,y:root.y+2*scale},root]);join(previousRoot.id,previousRoot.p,vine.id,previousRoot.p);join(vine.id,root,trunkId,root);}});
  previousRoot={id:trunkId,p:root};
 }
 for(const y of [h*.10,h*.91])group(`border-${y}`,'coordinated-border',()=>{
  const band=Math.min(4,h*.055),n=Math.max(3,Math.floor((w-6)/12)),step=(w-6)/n;
  path('border-rail',[{x:3,y:y-band},{x:w-3,y:y-band}],1);path('border-rail',[{x:3,y:y+band},{x:w-3,y:y+band}],1);
  const vine=Array.from({length:n*12+1},(_,i)=>({x:3+i*(w-6)/(n*12),y:y+Math.sin(i*Math.PI/6)*band*.42}));
  k.run('border-vine',dark,vine);
  for(let i=0;i<n;i++){
   const x=3+(i+.5)*step,R=band*.55;
   for(let j=0;j<6;j++){const a=j*Math.PI/3;k.leaf(j%2?coral:red,{x,y},a,R,R*.32,0,.60,'border-petal');}
   k.disc(gold,x,y,Math.max(.4,R*.22),'border-centre');
   for(const side of [-1,1]){const base={x:x+side*step*.31,y};k.leaf(dark,base,side<0?Math.PI+.4:-.4,Math.min(step*.22,2.8),band*.22,0,.5,'border-leaf');}
  }
 });
 const minLeafFlowerClearanceMm=Math.min(...leafBoxes.flatMap(l=>flowerBoxes.map(f=>Math.hypot(l.x-f.x,l.y-f.y)-l.r-f.r)));
 const leafFlowerOverlaps=leafBoxes.flatMap(l=>flowerBoxes.filter(f=>Math.hypot(l.x-f.x,l.y-f.y)<l.r+f.r).map(f=>`${l.id}:${f.id}`));
 if(leafFlowerOverlaps.length)throw Error('compound-floral:leaf-flower-clearance');
 const provenance:MotifProvenance={schema:'ascend.motif-provenance.v1',id:'original-compound-floral-v1',source:'urn:ascend:authored:compound-floral:v1',creator:'ASCEND authored compound floral grammar',community:null,culturalContext:'Contemporary original floral construction informed by Ukrainian embroidery layout studies; not an authenticated historical motif or a canonical ASCEND glyph.',retrievedAt:'2026-10-17T00:00:00Z',originalSha256:'d33b1ca8fe13d63732f9e5ca41985ed293b611fb2327263ad1d71e3888546764',permission:{status:'verified',evidence:'Original procedural geometry authored under user instruction; no source-image paths used. originalSha256 hashes the UTF-8 construction specification: ASCEND compound floral v1: scalloped flower foundations, alternating outer petals, nested inner petals and pollen; three connected heads, two terminal buds, four lower leaves per unit; two paired-rail diamond borders.',purposes:['analysis','reconstruction']},access:'structural-public',confidence:1,transformations:[{operation:'original compound floral construction',evidence:'Layered flowers, distinct buds, connected petioles and separate border fields; no model inference or traced historical paths.'}],regionalAttribution:{status:'unassigned'}};
 const checked=inspectAuthoredMotifAssembly(k.objs,connections,{widthMm:w,heightMm:h,seed:`compound-${seed}`},provenance,machine,assemblies.filter(a=>a.objectIds.length));
 for(const core of nestedCores){
  const parent=checked.graph.nodes.find(n=>n.id===core.parentId)!,outer=checked.graph.nodes.find(n=>n.id===core.outerId)!;
  const id=`${core.parentId}-nested-core`;
  checked.graph.nodes.push({...structuredClone(parent),id,parentId:parent.id,evidence:['Geometrically contained flower whorls, core and pollen; original compound floral construction.']});
  for(const childId of core.innerIds){const child=checked.graph.nodes.find(n=>n.id===childId)!;assertObservedContainment(outer.geometry!.paths,child.geometry!.paths);child.parentId=id;}
  checked.graph.relations.push({kind:'nest',from:parent.id,to:id});
 }
 assertMotifGraph(checked.graph);checked.structure=measureMotifStructure(checked.graph);
 const recipe=recipes['linen-180-prewashed']!,stitchPlan=plan(orderIndependentLayers(k.objs),recipe,{preserveObjectOrder:true}),minutes=estimateMinutes(stitchPlan,recipe.speedSpm);
 const gate=runGate(k.objs,stitchPlan.commands,recipe,{hoop:{name:machine?.id??'unselected machine',width:machine?.fieldX.value??w,height:machine?.fieldY.value??h}},minutes);
 const body=k.objs.map(o=>o.kind==='fill'?`<polygon points="${o.polygon.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${o.color}"/>`:`<polyline points="${o.path.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${o.color}" stroke-width="${o.kind==='satin'?o.width:.35}" stroke-linecap="round"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" data-design-state="compound-floral-reference"><metadata>Original compound floral grammar v1. Contemporary authored interpretation; no trained model applied; production approval false.</metadata><rect width="${w}" height="${h}" fill="#f5efe3"/>${body}</svg>`;
 return {...checked,input:{...input},svg,objects:k.objs,assemblies,columns:unitCount,leafFlowerOverlaps,minLeafFlowerClearanceMm,stitchPlan,stitchCount:stitchPlan.commands.filter(c=>c.cmd==='stitch').length,estimatedMinutes:minutes,stitchSvg:previewSvg(stitchPlan.commands,stitchPlan.colors),gate,blockers:[...checked.job.validation.errors,...gate.checks.filter(c=>!c.pass).map(c=>c.id),...(!machine?['machine-not-selected']:[])],sourceImagesEmbedded:false};
}
