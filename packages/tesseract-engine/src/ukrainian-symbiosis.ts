import {illuminatedOrnament} from './illuminated-ornament';
import {generateUkrainianBotanical,type BotanicalOptions} from './ukrainian-botanical';
import {penroseSun,GOLDEN_RATIO} from './penrose';
import {compoundIrSvg} from './compound-textile-compiler';
import type {StitchIrObject,StitchIrPoint} from './production-stitch-ir';
export const SYMBIOSIS_KINDS=['penrose-garden','penrose-ibex','illuminated-garden','illuminated-ibex'] as const;
export type SymbiosisKind=typeof SYMBIOSIS_KINDS[number];
export const SYMBIOSIS_REFERENCES=[
 {id:'met-448652',url:'https://www.metmuseum.org/art/collection/search/448652',observation:'Abbasid Iraq, probably Samarra, ninth-century carved doors: paired abstract vegetal forms; not a textile'},
 {id:'met-720594',url:'https://www.metmuseum.org/art/collection/search/720594',observation:'Egypt, Fustat, thirteenth/fourteenth-century ibex or gazelle block print on paper; not a printed textile'},
 {id:'met-451101',url:'https://www.metmuseum.org/art/collection/search/451101',observation:'Ottoman Turkey, ca. 1565–80: wavy-vine silk textile; comparative Islamic textile reference, not Arabic attribution'},
 {id:'penrose-mathworld',url:'https://mathworld.wolfram.com/PenroseTiles.html',observation:'Golden-ratio substitution and finite fivefold Penrose constructions'},
];
export type SymbiosisOptions=Omit<BotanicalOptions,'kind'>&{kind:SymbiosisKind;depth?:3|4|5};
export function generateUkrainianSymbiosis(o:SymbiosisOptions){
 if(!SYMBIOSIS_KINDS.includes(o.kind))throw Error('Unknown symbiosis family');
 const intricate=o.kind.startsWith("illuminated-");
 const animal=o.kind.endsWith("ibex");
 const depth=o.depth??(intricate?5:4);if(![3,4,5].includes(depth))throw Error('Penrose depth must be 3, 4 or 5');
 const base=generateUkrainianBotanical({...o,kind:'flowering-tree'}),{widthMm:w,heightMm:h}=base;
 const dark=o.palette==='garden-dark',ground=dark?'#202822':'#f6f0df',gold=dark?'#776646':'#d4bc8f',ink=dark?'#d9a54c':'#9e2436',contrast=dark?'#f4e8c8':'#f6f0df';
 const objects:StitchIrObject[]=[],triangles=penroseSun(depth,Math.PI/10),radius=Math.min(w*.40,h*.35);
 const map=(p:StitchIrPoint)=>({x:w/2+p.x*radius,y:h/2+p.y*radius});
 // A genuine finite substitution patch provides the underlying spatial mesh.
 triangles.forEach((t,i)=>{const p=[map(t.a),map(t.b),map(t.c),map(t.a)];objects.push({kind:'fill',id:'penrose:tile:'+i,color:dark?(t.type?'#293329':'#30372c'):(t.type?'#eee3cd':'#e8dac0'),polygon:p,angle:36,rowSpacing:.45});objects.push({kind:'satin',id:'penrose:edge:'+i,color:gold,width:.18,path:p,spacing:.4});});
 // Both sources influence the geometry: Ukrainian plant hierarchy + paired split foliage.
 objects.push(...(intricate?illuminatedOrnament(w,h,dark,o.tiers??4,o.seed):base.objects));
 const point=(x:number,y:number)=>({x:x*w/100,y:y*h/140});
 function line(id:string,p:StitchIrPoint[],color=ink,width=.4){objects.push({id,kind:'satin',color,width:width*w/100,path:p.map(q=>point(q.x,q.y)),spacing:.4});}
 function fill(id:string,p:StitchIrPoint[],color=ink){objects.push({id,kind:'fill',color,polygon:[...p.map(q=>point(q.x,q.y)),point(p[0]!.x,p[0]!.y)],angle:45,rowSpacing:.43});}
 if(!intricate)for(const side of [-1,1])for(let tier=0;tier<4;tier++){
  const x=50+side*35,y=27+tier*25,curve=[];
  for(let i=0;i<=48;i++){const t=i/48,a=t*Math.PI*2,r=5*(1-t)+.4;curve.push({x:x+side*r*Math.cos(a),y:y+r*Math.sin(a)});}
  line('arabesque:curl:'+side+':'+tier,curve);
  // Bifurcating pointed leaves, drawn anew rather than traced from carved panels.
  for(const lobe of [-1,1]){
   fill('arabesque:palmette:'+side+':'+tier+':'+lobe,[{x,y:y+9},{x:x+lobe*2,y:y+4},{x:x+lobe*5,y:y+1},{x:x+lobe*4,y:y+6},{x:x+lobe*1.5,y:y+10}],dark?'#879d70':ink);
   line('arabesque:vein:'+side+':'+tier+':'+lobe,[{x,y:y+9},{x:x+lobe*3.5,y:y+4}],contrast,.13);
  }
 }
 if(animal){
  // The foreground animals are original silhouettes, informed by the Fustat print.
  // Place them in the lower field, preserving the tree crown and fine border.
  for(const side of [-1,1]){
   const tx=(x:number,y:number)=>({x:50+side*(x-50),y});
   fill('ibex:body:'+side,[tx(62,108),tx(68,103),tx(79,103),tx(83,108),tx(79,113),tx(67,113)]);
   fill('ibex:neck:'+side,[tx(65,109),tx(62,97),tx(59,94),tx(61,91),tx(65,94),tx(70,105)]);
   fill('ibex:head:'+side,[tx(59,94),tx(55,93),tx(54,91),tx(58,89),tx(62,91)]);
   for(let leg=0;leg<4;leg++){const x=68+leg*3;line('ibex:leg:'+side+':'+leg,[tx(x,110),tx(x+(leg%2?1:-1),117),tx(x+(leg%2?2:-2),123),tx(x+(leg%2?4:-4),123)],ink,.8);}
   line('ibex:tail:'+side,[tx(81,107),tx(85,108),tx(86,111)],ink,.5);
   for(let horn=0;horn<2;horn++){const p=[];for(let i=0;i<=24;i++){const t=i/24;p.push(tx(59+horn*2+t*7,91-11*t+3*t*t));}line('ibex:horn:'+side+':'+horn,p,ink,.7);}
   for(let stripe=0;stripe<5;stripe++)line('ibex:chest-mark:'+side+':'+stripe,[tx(64,98+stripe*1.4),tx(66,99+stripe*1.4)],contrast,.23);
   line('ibex:eye:'+side,[tx(58.1,91.3),tx(58.7,91.3)],contrast,.7);
   line('ibex:back-detail:'+side,[tx(70,105),tx(73,106),tx(76,105),tx(79,106)],gold,.3);
   if(intricate){
    line('ibex:body-outline:'+side,[tx(62,108),tx(68,103),tx(79,103),tx(83,108),tx(79,113),tx(67,113),tx(62,108)],contrast,.16);
    for(let k=0;k<3;k++){
     const x=69+k*4,petals=[];for(let i=0;i<=80;i++){const a=i*Math.PI/40,r=1.35+.3*Math.cos(a*8);petals.push(tx(x+r*Math.cos(a),109+r*Math.sin(a)));}
     line('ibex:rosette:'+side+':'+k,petals,contrast,.15);
     for(let j=0;j<8;j++){const a=j*Math.PI/4;line('ibex:rosette-vein:'+side+':'+k+':'+j,[tx(x,109),tx(x+Math.cos(a),109+Math.sin(a))],contrast,.1);}
    }
    for(let k=0;k<5;k++)line('ibex:horn-ridge:'+side+':'+k,[tx(60+k*1.2,89-k*1.4),tx(61+k*1.2,89.4-k*1.4)],contrast,.15);
   }
  }
 }
 const references=[...base.metadata.references,...SYMBIOSIS_REFERENCES.filter(r=>animal||r.id!=='met-720594')];
 const metadata={...base.metadata,version:'ukrainian-symbiosis/3',collisionPolicy:'flower-head-clearance-and-flower-foreground',detail:intricate?'three-whorl-illumination':'classic-botanical',interlace:intricate?{ribbons:2,alternatingOverpasses:true,construction:'ordered-bridge-geometry'}:undefined,kind:o.kind,sourceIds:references.map(r=>r.id),references,conditioning:'separately-reviewed-Ukrainian-Arab-Islamic-and-mathematical-structure',penrose:{construction:'Robinson-half-tile-sun-substitution',goldenRatio:GOLDEN_RATIO,depth,triangleCount:triangles.length,finitePatch:true,matchingRuleRhombsVerified:false},culturalAttribution:'contemporary-fusion-not-historical-reproduction'};
 const svg=compoundIrSvg(objects,w,h).replace('#f6f0df',ground).replace('><rect',`><title>ASCEND ${o.kind}</title><desc>Contemporary fusion of separately reviewed plant, abstract vegetal and Penrose constructions.</desc><metadata>${JSON.stringify(metadata)}</metadata><rect`);
 return{svg,objects,metadata,widthMm:w,heightMm:h,palette:[ground,ink,gold,contrast]};
}
