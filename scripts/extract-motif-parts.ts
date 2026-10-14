import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromMotifMaskContours} from '../packages/tesseract-engine/src/motif-mask-contours';
import {rasterizeObservedContours} from '../packages/tesseract-engine/src/motif-contour-rasterization';
import {components} from '../packages/tesseract-engine/src/raster-features';
import type {MotifProvenance} from '../packages/tesseract-engine/src/motif-graph';
const out='data/research/motif-parts-v1';mkdirSync(out,{recursive:true});
const crops=[
 {id:'flower-gold',source:'commons-96737731',role:'flower',box:{left:256,top:80,width:198,height:176}},
 {id:'flower-sage',source:'commons-96737731',role:'flower',box:{left:77,top:121,width:166,height:168}},
 {id:'flower-lobed',source:'commons-96737731',role:'flower',box:{left:470,top:125,width:162,height:160}},
 {id:'flower-blue',source:'commons-96737731',role:'flower',box:{left:901,top:74,width:168,height:188}},
 {id:'flower-brown',source:'commons-96737731',role:'flower',box:{left:727,top:83,width:174,height:188}},
 {id:'flower-russet',source:'commons-96737731',role:'flower',box:{left:466,top:277,width:188,height:214}},
 {id:'flower-red',source:'commons-96737731',role:'flower',box:{left:75,top:289,width:164,height:214}},
 {id:'flower-ring',source:'commons-96737731',role:'flower',box:{left:1064,top:137,width:166,height:166}},
 {id:'flower-lower-blue',source:'commons-96737731',role:'flower',box:{left:675,top:355,width:170,height:180}},
 {id:'leaf-veined',source:'commons-96737731',role:'leaf',box:{left:750,top:300,width:118,height:108},maskPolygon:[[4,2],[18,4],[53,29],[93,66],[110,88],[70,72],[38,50],[17,29],[4,12]]},
 {id:'leaf-olive',source:'commons-96737753',role:'leaf',box:{left:597,top:36,width:44,height:65}},
 {id:'scroll-a',source:'commons-96737731',role:'border',box:{left:205,top:579,width:430,height:121}},
 {id:'scroll-b',source:'commons-96737731',role:'border',box:{left:638,top:579,width:434,height:121}},
] as const;
const palette=[{color:'#37392b',rgb:[55,57,43]},{color:'#657248',rgb:[101,114,72]},
 {color:'#a07452',rgb:[160,116,82]},{color:'#748786',rgb:[116,135,134]},{color:'#c7b176',rgb:[199,177,118]}];
async function main(){
 const pieces=[];
 for(const crop of crops){
  const base=`data/research/motif-references/${crop.source}`,original=readFileSync(`${base}/source.jpg`),provenance:MotifProvenance=JSON.parse(readFileSync(`${base}/provenance.json`,'utf8'));
  if(createHash('sha256').update(original).digest('hex')!==provenance.originalSha256||provenance.permission.status!=='verified'||!provenance.permission.purposes.includes('reconstruction'))throw Error('jigsaw:source-not-verified');
  const {data,info}=await sharp(original).extract(crop.box).resize({width:144}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw Error('jigsaw:expected-rgb');
  provenance.id+=`:${crop.id}`;
  const inside=(px:number,py:number,polygon:readonly (readonly [number,number])[])=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i]!,b=polygon[j]!;if((a[1]>py)!==(b[1]>py)&&px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  const labels=Int8Array.from({length:info.width*info.height},(_,i)=>{
   const x=(i%info.width+.5)/info.width-.5,y=(Math.floor(i/info.width)+.5)/info.height-.5;
   if('maskPolygon' in crop){if(!inside((x+.5)*crop.box.width,(y+.5)*crop.box.height,crop.maskPolygon))return -1;}else if(crop.role!=='border'&&(x*x/.25+y*y/.25)>1)return -1;
   const rgb=Array.from(data.subarray(i*3,i*3+3));
   // Explicit draft colour segmentation: retain darker pigment, discard pale scanned paper.
   const [r,g,b]=rgb;const paper=crop.source==='commons-96737753'?(r>165&&g>150&&b>90):(r>190&&g>175&&b>110);
   if(paper)return -1;
   let best=Infinity,label=-1;palette.forEach((p,j)=>{const d=rgb.reduce((n,v,k)=>n+(v-p.rgb[k])**2,0);if(d<best){best=d;label=j;}});return label;
  });
  provenance.transformations.push({operation:'source-fragment extraction',evidence:JSON.stringify({crop:crop.box,maskPolygon:'maskPolygon' in crop?crop.maskPolygon:null,resized:info,palette,segmentation:'paper iff plate37 R>165 G>150 B>90; plate27 R>190 G>175 B>110; nearest RGB palette otherwise; ellipse ROI for flower/leaf parts; explicit narrow polygon for veined leaf; draft, not expert segmentation'})});
  const layers=palette.map((p,j)=>{
   const mask=Uint8Array.from(labels,v=>v===j?1:0),r=graphFromMotifMaskContours(mask,info.width,info.height,provenance,info.width),decoded=rasterizeObservedContours(r.graph,info.width,info.height);
   if(mask.some((v,i)=>v!==decoded[i]))throw Error('jigsaw:mask-roundtrip-failed');
   // One colour layer retains all exact contour loops; disjoint component masks and holes use even/odd filling.
   const root=r.graph.nodes.find(n=>n.kind==='composition')!,field=r.graph.nodes.find(n=>n.kind==='region')!;
   const first=r.graph.nodes.find(n=>n.kind==='element');
   const graph=first?{...r.graph,nodes:[root,field,{...first,id:'layer-assembly',kind:'assembly' as const,parentId:field.id,geometry:undefined},
    {...first,id:'layer-contours',parentId:'layer-assembly',geometry:{...first.geometry!,paths:r.graph.nodes.flatMap(n=>n.geometry?.paths??[])}}]}:r.graph;
   const compactDecoded=rasterizeObservedContours(graph,info.width,info.height);
   if(mask.some((v,i)=>v!==compactDecoded[i]))throw Error('jigsaw:compact-mask-roundtrip-failed');
   return {color:p.color,graph,foregroundPixels:mask.reduce((n,v)=>n+v,0)};
  }).filter(l=>l.foregroundPixels);
  const edge=(x:number)=>Array.from({length:16},(_,i)=>{const y=Math.min(info.height-1,Math.floor((i+.5)*info.height/16));return labels[y*info.width+x];});
  const candidates=layers.flatMap((layer,index)=>layer.graph.nodes.flatMap(node=>node.geometry?node.geometry.paths.flatMap(path=>path.map(point=>({ownerId:`layer-${index}`,point}))):[]));
  const main=new Set(components(Uint8Array.from(labels,v=>v>=0?1:0),info.width,info.height,0,1).sort((a,b)=>b.length-a.length)[0]);
  const connected=candidates.filter(c=>[-1,0].some(dx=>[-1,0].some(dy=>{const x=c.point.x+dx,y=c.point.y+dy;return x>=0&&y>=0&&x<info.width&&y<info.height&&main.has(y*info.width+x);})));
  const nearest=(side:'base'|'left'|'right')=>[...connected].sort((a,b)=>{
   const score=(p:typeof a)=>side==='base'?-p.point.y+Math.abs(p.point.x-info.width/2)*.04:side==='left'?p.point.x+Math.abs(p.point.y-info.height/2)*.1:-p.point.x+Math.abs(p.point.y-info.height/2)*.1;
   return score(a)-score(b);
  })[0];
  if(!connected.length)throw Error('motif-parts:empty');
  const piece={id:crop.id,kind:crop.role,sourceId:provenance.id,width:info.width,height:info.height,crop:crop.box,layers,
   ports:{base:nearest('base'),left:nearest('left'),right:nearest('right')},segmentationReview:'draft',maskRoundtripExact:true};
  pieces.push(piece);await sharp(original).extract(crop.box).png().toFile(`${out}/${crop.id}-source.png`);
 }
 writeFileSync(`${out}/library.json`,JSON.stringify({schema:'ascend.motif-part-library.v1',pieces})+'\n');
 console.log(JSON.stringify({parts:pieces.length,colourLayers:pieces.reduce((n,f)=>n+f.layers.length,0),maskRoundtripExact:true,trainingPerformed:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
