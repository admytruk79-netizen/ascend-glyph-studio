/**
 * Historical-image bootstrap learner (research only).
 * Usage: npx tsx scripts/train-historical-image-baseline.ts
 * Environment: MET_LIMIT=40 MET_QUERY=embroidery
 * This is a small unsupervised feature-clustering baseline, NOT the Tesseract image generator.
 */
import sharp from "sharp";
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";

const base="https://collectionapi.metmuseum.org/public/collection";
const maxCandidates=Math.max(20,Math.min(2000,Number(process.env.MET_MAX_CANDIDATES??400)));
const limit=Math.max(1,Math.min(200,Number(process.env.MET_LIMIT??40)));
const query=process.env.MET_QUERY??"embroidery";
const out=process.env.MET_OUTPUT??"data/historical-baseline";
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function json(url:string):Promise<any>{
 for(let attempt=0;attempt<4;attempt++){
  let response:Response;
  try{response=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Research/0.1"},signal:AbortSignal.timeout(20000)});}catch(error){if(attempt===3)throw error;await sleep(800*(attempt+1));continue;}
  if(response.ok)return response.json();
  if(![429,500,502,503,504].includes(response.status))throw Error("HTTP "+response.status+" "+url);
  await sleep(800*(attempt+1));
 }
 throw Error("retry budget exhausted: "+url);
}
function distance(a:number[],b:number[]):number{
 return a.reduce((s,v,i)=>s+(v-b[i]!)**2,0);
}
function fitKmeans(data:number[][],k:number,iterations=30){
 const centers=data.slice(0,k).map(x=>[...x]);
 let labels:number[]=[];
 for(let epoch=0;epoch<iterations;epoch++){
  labels=data.map(x=>centers.reduce((best,c,i)=>distance(x,c)<distance(x,centers[best]!)?i:best,0));
  const sums=centers.map(()=>Array(data[0]!.length).fill(0) as number[]);
  const counts=centers.map(()=>0);
  data.forEach((x,i)=>{const group=labels[i]!;counts[group]!++;x.forEach((v,j)=>sums[group]![j]!+=v);});
  centers.forEach((c,i)=>{if(counts[i])c.forEach((_,j)=>c[j]=sums[i]![j]!/counts[i]!);});
 }
 return {centers,labels};
}
async function features(image:Buffer){
 const {data,info}=await sharp(image).resize(64,64,{fit:"fill"}).greyscale().raw().toBuffer({resolveWithObject:true});
 if(info.channels!==1)throw Error("expected grayscale");
 const hist=Array(8).fill(0) as number[];
 let horizontal=0,vertical=0,diag=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=data[y*64+x]!;
  hist[Math.min(7,Math.floor(v/32))]!++;
  if(x>0)horizontal+=Math.abs(v-data[y*64+x-1]!);
  if(y>0)vertical+=Math.abs(v-data[(y-1)*64+x]!);
  if(x>0&&y>0)diag+=Math.abs(v-data[(y-1)*64+x-1]!);
 }
 return [...hist.map(n=>n/4096),horizontal/(4032*255),vertical/(4032*255),diag/(3969*255)];
}
async function main(){
 await mkdir(out,{recursive:true});
 const search=await json(base+"/v1.1/search?"+new URLSearchParams({q:query,hasImages:"true"}));
 const rows:any[]=[];const hashes=new Set<string>();
 for(const id of ((search.objectIDs??[]) as number[]).slice(0,maxCandidates)){
  if(rows.length>=limit)break;
  try{
   const obj=await json(base+"/v1/objects/"+id);
   if(obj.isPublicDomain!==true||!obj.primaryImage||!obj.objectDate)continue;
   // Cultural access cannot be inferred from CC0. Unreviewed images are research-only.
   const res=await fetch(obj.primaryImageSmall||obj.primaryImage,{signal:AbortSignal.timeout(20000)});
   if(!res.ok)continue;
   const bytes=Buffer.from(await res.arrayBuffer());
   if(bytes.length>20_000_000)continue;
   const hash=createHash("sha256").update(bytes).digest("hex");
   if(hashes.has(hash))continue;
   const vector=await features(bytes);hashes.add(hash);
   rows.push({id,objectURL:obj.objectURL,imageURL:obj.primaryImage,title:obj.title,period:obj.objectDate,culture:obj.culture,medium:obj.medium,institution:"Metropolitan Museum of Art",rights:"CC0 per object isPublicDomain",culturalAccess:"unreviewed",commercialDerivation:false,sha256:hash,features:vector});
  }catch(error){console.error("skip",id,String(error));}
  await sleep(180);
 }
 if(rows.length<3)throw Error("Insufficient eligible images for baseline: "+rows.length+" from "+maxCandidates+" candidates");
 const k=Math.min(6,Math.max(2,Math.floor(Math.sqrt(rows.length/2))));
 const trained=fitKmeans(rows.map(r=>r.features),k);
 const model={schema:"ascend.historical-image-baseline.v1",method:"grayscale-histogram-gradient-kmeans",source:"Met Open Access",query,examples:rows.length,k,centers:trained.centers,limitations:["research-only; cultural access unreviewed","not generative","no canonical ASCEND geometry learned","not a production-approved model"]};
 await writeFile(out+"/model.json",JSON.stringify(model,null,2));
 await writeFile(out+"/manifest.json",JSON.stringify(rows.map((r,i)=>({...r,cluster:trained.labels[i]})),null,2));
 console.log("TRAINED BASELINE",JSON.stringify({examples:rows.length,clusters:k,output:out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
