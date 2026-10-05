import fs from"node:fs";
import readline from"node:readline";
import {Readable} from"node:stream";
const out=".corpus-out";fs.mkdirSync(out,{recursive:true});
const target=Math.max(1,Number(process.env.TARGET||250000));
const terms=/textile|embroider|weav|woven|bead|quill|cloth|costume|garment|tapestry|needlework|lace|appliqu|quilt|rug|carpet|ikat|batik|brocade|sampler|fabric|dress|shawl|sash|blanket|belt|robe|ornament|decorative|pattern|panel|fragment/i;
const seen=new Set(),rows=[];
const add=(source,id,url,query,extra={})=>{const k=source+"|"+id;if(seen.has(k)||rows.length>=target)return;seen.add(k);rows.push({source,objectId:String(id),url,query,status:"candidate",...extra})};
async function json(url){const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.1"});if(!r.ok)throw new Error(url+" "+r.status);return r.json()}
function csv(line){const a=[];let s="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){s+='"';i++}else q=!q}else if(ch===","&&!q){a.push(s);s=""}else s+=ch}a.push(s);return a}
async function metBulk(){
 const url="https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv";
 const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.1"}});if(!r.ok)throw new Error("Met bulk "+r.status);
 const input=Readable.fromWeb(r.body);
 const rl=readline.createInterface({input,crlfDelay:Infinity});let headers=null;
 for await(const line of rl){if(!headers){headers=csv(line);continue}const v=csv(line),o=Object.fromEntries(headers.map((h,i)=>[h,v[i]||""]));
   const text=[o["Object Name"],o["Title"],o["Culture"],o["Period"],o["Medium"],o["Classification"],o["Department"]].join(" ");
   const image=o["Primary Image"]||o["Primary Image Small"]||"";
   if(!terms.test(text)||o["Is Public Domain"]!=="True"||!image)continue;const id=o["Object ID"];if(!id)continue;
   add("met",id,"https://www.metmuseum.org/art/collection/search/"+id,"bulk-metadata",{title:o["Title"]||"",culture:o["Culture"]||"",classification:o["Classification"]||"",isPublicDomain:true,imageUrl:image});
   if(rows.length>=target)break;
 }
}
async function rijks(){
 const searches=[
   ["type","textile"],["type","costume"],["type","tapestry"],["type","carpet"],["type","rug"],
   ["material","textile"],["material","wool"],["material","silk"],["material","linen"],["material","cotton"],
   ["technique","embroidering"],["technique","weaving"],["technique","lace"],["technique","brocade"],
   ["description","ornament"],["description","pattern"]
 ];
 for(const [field,q] of searches){let next="https://data.rijksmuseum.nl/search/collection?imageAvailable=true&"+field+"="+encodeURIComponent(q);let pages=0;
   while(next&&rows.length<target&&pages++<1000){const b=await json(next);const items=b.orderedItems||[];
     for(const x of items){const id=(x.id||"").toString().split("/").pop();if(id)add("rijks",id,x.id,q,{resolverUrl:"https://data.rijksmuseum.nl/"+id+"?_profile=la-framed",imageAvailable:true})}
     const n=b.next;next=typeof n==="string"?n:(n?.id||null);
     if(!items.length)break;
   }
 }
}
async function vam(){
 const qs=["textile","embroidery","woven","weaving","costume","garment","fabric","carpet","rug","ornament","pattern","lace","tapestry","brocade","ikat","batik","sampler","quilt","beadwork"];
 for(const q of qs){let page=1,pages=1;
   while(page<=pages&&rows.length<target&&page<=1000){const b=await json("https://api.vam.ac.uk/v2/objects/search?q="+encodeURIComponent(q)+"&images_exist=1&page_size=100&page="+page);
     pages=Math.min(Number(b.info?.pages||1),1000);
     for(const r of b.records||[]){const id=r.systemNumber;if(!id||!r._primaryImageId)continue;
       add("vam",id,"https://collections.vam.ac.uk/item/"+id,q,{title:r._primaryTitle||r.objectType||"",objectType:r.objectType||"",place:r._primaryPlace||"",imageId:r._primaryImageId,imageUrl:"https://framemark.vam.ac.uk/collections/"+r._primaryImageId+"/full/!1200,1200/0/default.jpg"});
     }page++;
   }
 }
}
async function aic(){for(let page=1;page<=1000&&rows.length<target;page++){const b=await json("https://api.artic.edu/api/v1/artworks?limit=100&page="+page+"&fields=id,title,image_id,is_public_domain,classification_title,medium_display,department_title");for(const r of b.data||[]){const text=[r.title,r.classification_title,r.medium_display,r.department_title].filter(Boolean).join(" ");if(!r.is_public_domain||!r.image_id||!terms.test(text))continue;add("aic",r.id,"https://www.artic.edu/artworks/"+r.id,"metadata-filter",{title:r.title||"",imageId:r.image_id,imageUrl:"https://www.artic.edu/iiif/2/"+r.image_id+"/full/843,/0/default.jpg"})}if(!(b.data||[]).length)break}}
async function cma(){for(let skip=0;skip<200000&&rows.length<target;skip+=1000){const b=await json("https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&limit=1000&skip="+skip);const recs=b.data||[];for(const r of recs){const text=[r.title,r.type_title,r.technique,r.tombstone].filter(Boolean).join(" ");if(!terms.test(text))continue;const imageUrl=r.images?.web?.url||r.images?.print?.url||r.images?.full?.url||null;add("cma",r.id,"https://www.clevelandart.org/art/"+r.id,"metadata-filter",{title:r.title||"",imageUrl})}if(!recs.length)break}}
for(const fn of [metBulk,rijks,vam,aic,cma]){try{await fn()}catch(e){console.error(e)}if(rows.length>=target)break}
fs.writeFileSync(out+"/candidate-250k.jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
const bySource=Object.fromEntries([...new Set(rows.map(x=>x.source))].map(s=>[s,rows.filter(x=>x.source===s).length]));
const withDirectImage=rows.filter(x=>x.imageUrl).length;
fs.writeFileSync(out+"/candidate-250k-stats.json",JSON.stringify({target,count:rows.length,withDirectImage,distinctSources:Object.keys(bySource).length,bySource,generatedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({target,count:rows.length,withDirectImage,bySource}));
if(rows.length<target)process.exitCode=2;
