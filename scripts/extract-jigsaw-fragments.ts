import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromMotifMaskContours} from '../packages/tesseract-engine/src/motif-mask-contours';
import {rasterizeObservedContours} from '../packages/tesseract-engine/src/motif-contour-rasterization';
import type {MotifProvenance} from '../packages/tesseract-engine/src/motif-graph';
const out='data/research/jigsaw-fragments-v1';mkdirSync(out,{recursive:true});
const crops=[
 {id:'bouquet-ribbon',source:'commons-96737731',role:'bouquet',box:{left:22,top:50,width:640,height:505}},
 {id:'bouquet-vase',source:'commons-96737731',role:'bouquet',box:{left:675,top:40,width:585,height:545}},
 {id:'branch-lobed',source:'commons-96737753',role:'branch',box:{left:185,top:25,width:345,height:405}},
 {id:'branch-bells',source:'commons-96737753',role:'branch',box:{left:525,top:35,width:575,height:395}},
 {id:'scroll-border-a',source:'commons-96737731',role:'border',box:{left:205,top:579,width:430,height:121}},
 {id:'scroll-border-b',source:'commons-96737731',role:'border',box:{left:638,top:579,width:434,height:121}},
] as const;
const palette=[{color:'#37392b',rgb:[55,57,43]},{color:'#657248',rgb:[101,114,72]},
 {color:'#a07452',rgb:[160,116,82]},{color:'#748786',rgb:[116,135,134]},{color:'#c7b176',rgb:[199,177,118]}];
async function main(){
 const fragments=[];
 for(const crop of crops){
  const base=`data/research/motif-references/${crop.source}`,original=readFileSync(`${base}/source.jpg`),provenance:MotifProvenance=JSON.parse(readFileSync(`${base}/provenance.json`,'utf8'));
  if(createHash('sha256').update(original).digest('hex')!==provenance.originalSha256||provenance.permission.status!=='verified'||!provenance.permission.purposes.includes('reconstruction'))throw Error('jigsaw:source-not-verified');
  const {data,info}=await sharp(original).extract(crop.box).resize({width:144}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw Error('jigsaw:expected-rgb');
  const labels=Int8Array.from({length:info.width*info.height},(_,i)=>{
   const rgb=Array.from(data.subarray(i*3,i*3+3));
   // Explicit draft colour segmentation: retain darker pigment, discard pale scanned paper.
   const [r,g,b]=rgb;const paper=crop.source==='commons-96737753'?(r>165&&g>150&&b>90):(r>190&&g>175&&b>110);
   if(paper)return -1;
   let best=Infinity,label=-1;palette.forEach((p,j)=>{const d=rgb.reduce((n,v,k)=>n+(v-p.rgb[k])**2,0);if(d<best){best=d;label=j;}});return label;
  });
  provenance.transformations.push({operation:'source-fragment extraction',evidence:JSON.stringify({crop:crop.box,resized:info,palette,segmentation:'paper iff plate37 R>165 G>150 B>90; plate27 R>190 G>175 B>110; nearest RGB palette otherwise; draft, not expert segmentation'})});
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
  const fragment={id:crop.id,role:crop.role,sourceId:provenance.id,width:info.width,height:info.height,crop:crop.box,layers,leftEdge:edge(0),rightEdge:edge(info.width-1),segmentationReview:'draft',maskRoundtripExact:true};
  fragments.push(fragment);await sharp(original).extract(crop.box).png().toFile(`${out}/${crop.id}-source.png`);
 }
 writeFileSync(`${out}/library.json`,JSON.stringify({schema:'ascend.source-fragment-library.v1',fragments})+'\n');
 console.log(JSON.stringify({fragments:fragments.length,colourLayers:fragments.reduce((n,f)=>n+f.layers.length,0),maskRoundtripExact:true,trainingPerformed:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
