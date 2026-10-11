/** Reproducible first-stage historical-image acquisition, not model training.
 * Run: npx tsx scripts/collect-met-historical-images.ts
 * Uses the Met's CC0 Open Access API; keeps image URLs and provenance metadata.
 */
import {mkdir,writeFile} from "node:fs/promises";
const api="https://collectionapi.metmuseum.org/public/collection";
const queries=["Ukrainian embroidery","embroidered textile","woven geometric textile","embroidered border"];
type RecordEntry={id:string;source:string;title:string;culture:string;date:string;medium:string;objectUrl:string;imageUrl:string;rights:"Met Open Access CC0";trainingUse:"composition";access:"review-required";sourceObjectId:number};
const records=new Map<number,RecordEntry>();
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function getJson(url:string):Promise<any>{
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-research/0.1 (provenance-first)"}});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}
  catch(e){if(attempt===2)throw e;await delay(1500*(attempt+1));}
 }
}
for(const q of queries){
 const search=await getJson(`${api}/v1.1/search?q=${encodeURIComponent(q)}&hasImages=true&limit=50&offset=0`);
 for(const id of (search.objectIDs??[]).slice(0,50)){
  try{
   const o=await getJson(`${api}/v1/objects/${id}`);
   if(o.isPublicDomain!==true||!o.primaryImage||!o.objectURL)continue;
   records.set(id,{id:`met:${id}`,source:"Metropolitan Museum of Art Open Access",title:o.title??"",culture:o.culture??"",date:o.objectDate??"",medium:o.medium??"",objectUrl:o.objectURL,imageUrl:o.primaryImage,rights:"Met Open Access CC0",trainingUse:"composition",access:"review-required",sourceObjectId:id});
  }catch(e){console.error("skip object",id,String(e));}
  await delay(200);
 }
}
await mkdir("data/historical-met",{recursive:true});
const output=[...records.values()].sort((a,b)=>a.sourceObjectId-b.sourceObjectId);
await writeFile("data/historical-met/candidates.json",JSON.stringify({schema:"ascend.historical.candidates.v1",generatedAt:new Date().toISOString(),source:"https://metmuseum.github.io/",count:output.length,records:output},null,2)+"\n");
console.log(`Saved ${output.length} CC0 candidate records. Images are NOT downloaded, analyzed, trained, or approved for synthesis.`);
