import {compoundIrSvg} from './compound-textile-compiler';
import type {StitchIrObject,StitchIrPoint} from './production-stitch-ir';
export const BOTANICAL_KINDS=['flowering-tree','curling-vine','paired-bird-garden'] as const;
export type BotanicalKind=typeof BOTANICAL_KINDS[number];
export type BotanicalOptions={seed:string;kind:BotanicalKind;widthMm?:number;heightMm?:number;palette?:'red-cream'|'garden-dark';tiers?:3|4|5};
export const BOTANICAL_REFERENCES=[
 {id:'kro-537',url:'https://krovets.ua/item/kro-537',observation:'Fine branching floral stems and narrow climbing borders'},
 {id:'kro-610',url:'https://krovets.ua/item/kro-610',observation:'Documented tree-of-life ornament with flowers at several scales'},
 {id:'kro-613',url:'https://krovets.ua/item/kro-613',observation:'Documented tree-of-life ornament with curled stems and dense floral field'},
 {id:'kro-517',url:'https://krovets.ua/item/kro-517',observation:'Angular bird-like silhouettes in woven bands; visual interpretation, not a documented species'},
];
const hash=(s:string)=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
/** Independently drawn botanical geometry from public-view structural observations.
 * No photographs, traced motifs, learned-model claim or machine-file claim.
 */
export function generateUkrainianBotanical(o:BotanicalOptions){
 const widthMm=o.widthMm??180,heightMm=o.heightMm??250,tiers=o.tiers??4;
 if(!BOTANICAL_KINDS.includes(o.kind))throw Error('Unknown botanical family');
 if(!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||widthMm<80||widthMm>500||heightMm<100||heightMm>600)throw Error('Invalid botanical dimensions');
 if(![3,4,5].includes(tiers))throw Error('Branch tiers must be 3, 4 or 5');
 if(o.palette!==undefined&&!['red-cream','garden-dark'].includes(o.palette))throw Error('Unknown botanical palette');
 const dark=o.palette==='garden-dark',ground=dark?'#202822':'#f6f0df';
 const colours=dark?['#d06b5c','#d9a54c','#879d70','#f4e8c8','#202822']:['#9e2436','#c34c53','#9e2436','#f6f0df','#f6f0df'];
 const objects:StitchIrObject[]=[],variant=hash(o.seed)%6;
 const transform=(p:StitchIrPoint)=>({x:p.x*widthMm/100,y:p.y*heightMm/140});
 function fill(id:string,points:StitchIrPoint[],colour:number){const poly=points.map(transform);poly.push({...poly[0]!});objects.push({id,kind:'fill',color:colours[colour]!,polygon:poly,angle:45,rowSpacing:.43});}
 function line(id:string,points:StitchIrPoint[],colour=0,width=.45){objects.push({id,kind:'satin',color:colours[colour]!,width:width*widthMm/100,path:points.map(transform),spacing:.4});}
 function curve(id:string,a:StitchIrPoint,b:StitchIrPoint,c:StitchIrPoint,d:StitchIrPoint,colour=0,width=.45){const points=[];for(let i=0;i<=32;i++){const t=i/32,u=1-t;points.push({x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y});}line(id,points,colour,width);return points;}
 function ellipse(id:string,x:number,y:number,rx:number,ry:number,angle:number,colour:number){fill(id,Array.from({length:32},(_,i)=>{const t=i*Math.PI/16,a=rx*Math.cos(t),b=ry*Math.sin(t);return{x:x+a*Math.cos(angle)-b*Math.sin(angle),y:y+a*Math.sin(angle)+b*Math.cos(angle)};}),colour);}
 function leaf(id:string,x:number,y:number,angle:number,size:number){
  const points=Array.from({length:32},(_,i)=>{const t=i*Math.PI/16,a=size*Math.cos(t),b=size*.38*Math.sin(t)*(1-.25*Math.abs(Math.cos(t)));return{x:x+a*Math.cos(angle)-b*Math.sin(angle),y:y+a*Math.sin(angle)+b*Math.cos(angle)};});fill(id,points,2);line(id+':vein',[{x:x-size*.75*Math.cos(angle),y:y-size*.75*Math.sin(angle)},{x:x+size*.75*Math.cos(angle),y:y+size*.75*Math.sin(angle)}],dark?3:3,.16);
 }
 function flower(id:string,x:number,y:number,r:number,petals:number){
  // Radial petal veins and two offset whorls articulate each blossom.

  for(let ring=0;ring<2;ring++)for(let k=0;k<petals;k++){
   const a=k*Math.PI*2/petals+(ring?Math.PI/petals:0),radius=r*(ring?.4:.66);
   ellipse(id+':petal:'+ring+':'+k,x+radius*Math.cos(a),y+radius*Math.sin(a),r*(ring?.29:.42),r*(ring?.14:.2),a,ring?1:0);
  }
  for(let k=0;k<petals;k++){
   const a=k*Math.PI*2/petals;
   line(id+':petal-vein:'+k,[{x:x+r*.5*Math.cos(a),y:y+r*.5*Math.sin(a)},{x:x+r*.87*Math.cos(a),y:y+r*.87*Math.sin(a)}],dark?3:3,.09);
  }
  ellipse(id+':heart',x,y,r*.21,r*.21,0,dark?1:0);
  for(let k=0;k<8;k++){const a=k*Math.PI/4;ellipse(id+':stamen:'+k,x+r*.15*Math.cos(a),y+r*.15*Math.sin(a),r*.028,r*.028,0,3);}
 }
 // Closed vine frame with smaller flowers, opposing leaves and corner rosettes.
 for(const side of [-1,1]){
  const base=50+side*43,points=[];
  for(let y=12;y<=128;y++)points.push({x:base+1.2*Math.sin((y-12)*Math.PI/15),y});line('border:vine:'+side,points,0,.4);
  for(let y=18;y<125;y+=13){leaf('border:leaf:'+side+':'+y,base-side*1.5,y,side>0?-Math.PI/4:Math.PI/4,1.7);flower('border:flower:'+side+':'+y,base,y+5,1.45,6);}
 }
 for(const y of [8,132]){line('border:rail:'+y,[{x:8,y},{x:92,y}],0,.3);for(let x=14;x<=86;x+=12){leaf('border:horizontal:'+x+':'+y,x,y,0,2.1);flower('border:terminal:'+x+':'+y,x+5,y,1.4,6);}}
 if(o.kind==='curling-vine'){
  const count=tiers+2;
  for(let i=0;i<count;i++){
   const y=23+i*92/(count-1),side=i%2?1:-1,x=50+side*(17+variant%3);
   curve('vine:stem:'+i,{x:50,y:y+12},{x:50-side*27,y:y+6},{x:x+side*6,y:y-12},{x,y},0,.65);
   flower('vine:blossom:'+i,x,y,6+(i%3)*.65,8+variant%2*2);
   leaf('vine:leaf:'+i,50-side*9,y+8,side*Math.PI/4,4.1);
   flower('vine:bud:'+i,50-side*23,y+2,2.5,6);
  }
 }else{
  // Central root/vase and finite branch hierarchy; successive tiers vary in reach.
  fill('tree:vase',[{x:42,y:120},{x:58,y:120},{x:55,y:128},{x:45,y:128}],0);
  line('tree:trunk',[{x:50,y:120},{x:50,y:25}],0,.85);
  for(let i=0;i<tiers;i++)for(const side of [-1,1]){
   const y=106-i*70/(tiers-1),reach=24-i*2+(variant%3-1)*2,x=50+side*reach;
   const endY=y-10-(variant>=3?i*1.2:0);
   const points=curve('tree:branch:'+i+':'+side,{x:50,y:y+6},{x:50+side*12,y:y+3},{x:x+side*6,y:endY-8},{x,y:endY},0,.7);
   flower('tree:flower:'+i+':'+side,x,endY,5.7-i*.45,8+(variant%2)*2);
   const p=points[14]!;leaf('tree:leaf:'+i+':'+side,p.x,p.y-2,side*Math.PI/3,4.2-i*.25);
   const q=points[23]!;leaf('tree:leaflet:'+i+':'+side,q.x-side*2,q.y+4,-side*Math.PI/4,2.9);
   curve('tree:twig:'+i+':'+side,p,{x:p.x+side*5,y:p.y-2},{x:p.x+side*8,y:p.y-9},{x:p.x+side*5,y:p.y-11},0,.3);
   flower('tree:bud:'+i+':'+side,p.x+side*5,p.y-11,2,6);
   // Curled secondary branches occupy the interior spaces at a smaller scale.
   const cx=50+side*(13+variant%2),cy=y-5,spiral:StitchIrPoint[]=[];
   for(let k=0;k<=64;k++){const t=k/64,a=t*Math.PI*2.6,r=4.5*(1-t)+.5;spiral.push({x:cx+side*r*Math.cos(a),y:cy+r*Math.sin(a)});}
   curve('tree:curl-stem:'+i+':'+side,{x:50,y:y+3},{x:50+side*5,y:y-3},{x:cx+side*7,y:cy+7},spiral[0]!,0,.35);
   line('tree:curl:'+i+':'+side,spiral,0,.3);
   flower('tree:curl-bud:'+i+':'+side,cx,cy,1.2,6);
   for(let j=0;j<3;j++){
    const lx=50+side*(5+j*4),ly=y-3-j*2;
    leaf('tree:secondary-leaf:'+i+':'+side+':'+j,lx,ly,-side*(.65+j*.12),2.4-j*.3);
   }
   // Independent small sprigs make a second cadence outside the main branch.
   const sx=50+side*30,sy=y+5;
   curve('tree:sprig:'+i+':'+side,{x:sx,y:sy+7},{x:sx-side*3,y:sy+3},{x:sx+side*3,y:sy-3},{x:sx,y:sy-5},0,.3);
   flower('tree:sprig-flower:'+i+':'+side,sx,sy-5,2.5,6);
   leaf('tree:sprig-leaf:'+i+':'+side,sx-side*2,sy+1,side*.6,2.3);

  }
  flower('tree:crown',50,22,7,10);
  for(let y=46;y<=108;y+=20)flower('tree:axis:'+y,50,y,2.3,6);
  if(o.kind==='paired-bird-garden')for(const side of [-1,1]){
   const x=50+side*17,y=114;
   // New facing-bird silhouettes: body, raised wing, fan tail, head and beak.
   ellipse('bird:body:'+side,x,y,6,3.3,-side*.2,0);
   fill('bird:wing:'+side,[{x:x-side*3,y},{x:x+side*2,y:y-10},{x:x+side*6,y:y-7},{x:x+side*4,y:y+1}],1);
   for(let k=0;k<4;k++)line('bird:feather:'+side+':'+k,[{x:x+side*(1+k*.7),y:y-6+k*.7},{x:x+side*2,y:y-1}],3,.18);
   ellipse('bird:head:'+side,x-side*5,y-3,2.2,2.2,0,0);
   fill('bird:beak:'+side,[{x:x-side*6,y:y-4},{x:x-side*9,y:y-3},{x:x-side*6,y:y-2}],1);
   ellipse('bird:eye:'+side,x-side*5.5,y-3.5,.4,.4,0,3);
   for(let k=0;k<3;k++)leaf('bird:tail:'+side+':'+k,x+side*(7+k*.6),y-2+k*2,side*.5+k*.3,3.6);
   line('bird:leg:'+side,[{x,y:y+3},{x,y:y+7},{x:x-side*2,y:y+7}],0,.3);
  }
 }
 const references=BOTANICAL_REFERENCES.filter(r=>o.kind==='paired-bird-garden'||r.id!=='kro-517');
 const metadata={version:'ukrainian-botanical/1',kind:o.kind,seed:o.seed,branchTiers:tiers,structuralVariant:variant,sourceIds:references.map(r=>r.id),references,bandCount:1,inkCoverage:undefined,status:'design-prototype',geometry:'shared-fill-and-satin-ir',conditioning:'human-reviewed-public-source-structure',notMachineValidated:true,independentlyDrawn:true};
 const svg=compoundIrSvg(objects,widthMm,heightMm).replace('#f6f0df',ground).replace('><rect',`><title>ASCEND ${o.kind}</title><desc>Independently drawn botanical composition; source structure reviewed from public Krovets title images. Not a historical reproduction.</desc><metadata>${JSON.stringify(metadata)}</metadata><rect`);
 return{svg,objects,metadata,widthMm,heightMm,palette:[ground,...colours]};
}
