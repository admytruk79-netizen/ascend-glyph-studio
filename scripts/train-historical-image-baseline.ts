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
 // Structural signals: symmetry, periodicity and coarse spatial occupancy.
 // These are image-level proxies, not semantic motif recognition.
 let leftRight=0,topBottom=0;
 const cells=Array(16).fill(0) as number[];
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=data[y*64+x]!;
  leftRight+=Math.abs(v-data[y*64+(63-x)]!);
  topBottom+=Math.abs(v-data[(63-y)*64+x]!);
  cells[Math.floor(y/16)*4+Math.floor(x/16)]!+=(255-v)/(256*255);
 }
 const periodicity:number[]=[];
 for(const lag of [4,8,16,32]){
  let difference=0,count=0;
  for(let y=0;y<64;y++)for(let x=0;x<64-lag;x++){
   difference+=Math.abs(data[y*64+x]!-data[y*64+x+lag]!);count++;
  }
  periodicity.push(1-difference/(count*255));
 }
 return [...hist.map(n=>n/4096),horizontal/(4032*255),vertical/(4032*255),diag/(3969*255),1-leftRight/(4096*255),1-topBottom/(4096*255),...periodicity,...cells];
}
async function main(){
 await mkdir(out,{recursive:true});
 // Two independent open-access museum catalogs. A retired search endpoint
 // must not prevent the entire training run from collecting real images.
 const candidates:Array<{source:"met"|"artic";id:number}>=[];
 const sourceErrors:Record<string,string>={};
 try{
  const search=await json(base+"/v1.1/search?"+new URLSearchParams({q:query,hasImages:"true"}));
  for(const id of ((search.objectIDs??[]) as number[]).slice(0,maxCandidates))candidates.push({source:"met",id});
 }catch(error){sourceErrors.met=String(error);console.error("Met search unavailable",error);}
 try{
  const pages=Math.min(5,Math.ceil(maxCandidates/100));
  for(let page=1;page<=pages;page++){
   const url="https://api.artic.edu/api/v1/artworks/search?"+new URLSearchParams({q:query,fields:"id",limit:"100",page:String(page)});
   const result=await json(url);
   for(const item of result.data??[])if(Number.isInteger(item.id))candidates.push({source:"artic",id:item.id});
   if(!(result.data?.length))break;
  }
 }catch(error){sourceErrors.artic=String(error);console.error("Art Institute search unavailable",error);}
 const rows:any[]=[];const hashes=new Set<string>();
 const rejectionCounts:Record<string,number>={};
 const reject=(reason:string)=>{rejectionCounts[reason]=(rejectionCounts[reason]??0)+1;};
 for(const candidate of candidates){
  if(rows.length>=limit)break;
  const {id,source}=candidate;
  try{
   const obj=source==="met"
    ? await json(base+"/v1/objects/"+id)
    : await (async()=>{
       const response=await json("https://api.artic.edu/api/v1/artworks/"+id+"?"+new URLSearchParams({fields:"id,title,date_display,culture,medium_display,image_id,is_public_domain"}));
       const a=response.data;
       return {
        isPublicDomain:a?.is_public_domain===true,
        primaryImage:a?.image_id?"https://www.artic.edu/iiif/2/"+encodeURIComponent(a.image_id)+"/full/600,/0/default.jpg":"",
        primaryImageSmall:a?.image_id?"https://www.artic.edu/iiif/2/"+encodeURIComponent(a.image_id)+"/full/600,/0/default.jpg":"",
        objectDate:a?.date_display,
        objectURL:"https://www.artic.edu/artworks/"+id,
        title:a?.title,culture:a?.culture,medium:a?.medium_display
       };
      })();
   if(obj.isPublicDomain!==true||!obj.primaryImage||!obj.objectDate){reject("ineligible-metadata");continue;}
   // Cultural access cannot be inferred from CC0. Unreviewed images are research-only.
   const res=await fetch(obj.primaryImageSmall||obj.primaryImage,{signal:AbortSignal.timeout(20000)});
   if(!res.ok){reject("image-http-"+res.status);continue;}
   const bytes=Buffer.from(await res.arrayBuffer());
   if(bytes.length>20_000_000){reject("image-too-large");continue;}
   const hash=createHash("sha256").update(bytes).digest("hex");
   if(hashes.has(hash)){reject("duplicate-image");continue;}
   const vector=await features(bytes);hashes.add(hash);
   rows.push({id,objectURL:obj.objectURL,imageURL:obj.primaryImage,title:obj.title,period:obj.objectDate,culture:obj.culture,medium:obj.medium,institution:source==="met"?"Metropolitan Museum of Art":"Art Institute of Chicago",rights:source==="met"?"Met Open Access public-domain flag":"Art Institute of Chicago public-domain flag",culturalAccess:"unreviewed",commercialDerivation:false,sha256:hash,features:vector});
  }catch(error){reject("fetch-or-analysis-error");console.error("skip",id,String(error));}
  await sleep(180);
 }
 await writeFile(out+"/ingestion-report.json",JSON.stringify({query,maxCandidates,accepted:rows.length,candidates:candidates.length,sourceErrors,rejectionCounts},null,2));
 if(rows.length<3)throw Error("Insufficient eligible images for baseline: "+rows.length+" from "+maxCandidates+" candidates; see ingestion-report.json");
 const k=Math.min(6,Math.max(2,Math.floor(Math.sqrt(rows.length/2))));
 const trained=fitKmeans(rows.map(r=>r.features),k);
 const model={schema:"ascend.historical-image-baseline.v2",method:"grayscale-histogram-gradient-symmetry-periodicity-occupancy-kmeans",source:"Met Open Access and Art Institute of Chicago public-domain collections",query,examples:rows.length,k,centers:trained.centers,limitations:["research-only; cultural access unreviewed","not generative","no canonical ASCEND geometry learned","not a production-approved model"]};
 await writeFile(out+"/model.json",JSON.stringify(model,null,2));
 await writeFile(out+"/manifest.json",JSON.stringify(rows.map((r,i)=>({...r,cluster:trained.labels[i]})),null,2));
 console.log("TRAINED BASELINE",JSON.stringify({examples:rows.length,clusters:k,output:out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
