import fs from"node:fs";
import readline from"node:readline";
const out=".corpus-out";fs.mkdirSync(out,{recursive:true});
const target=Math.max(1,Number(process.env.TARGET||250000));
const terms=/textile|embroider|weav|woven|bead|quill|cloth|costume|garment|tapestry|needlework|lace|appliqu|quilt|rug|carpet|ikat|batik|brocade|sampler|fabric|dress|shawl|sash|blanket|belt|robe|ornament|decorative|pattern|panel|fragment/i;
const seen=new Set(),rows=[];
const add=(source,id,url,query,extra={})=>{const k=source+"|"+id;if(seen.has(k)||rows.length>=target)return;seen.add(k);rows.push({source,objectId:String(id),url,query,status:"candidate",...extra})};
async function json(url){const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.0"}});if(!r.ok)throw new Error(url+" "+r.status);return r.json()}
function csv(line){const a=[];let s="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){s+='"';i++}else q=!q}else if(ch===","&&!q){a.push(s);s=""}else s+=ch}a.push(s);return a}
async function metBulk(){
 const url="https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv";
 const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.0"}});if(!r.ok)throw new Error("Met bulk "+r.status);
 const rl=readline.createInterface({input:r.body,crlfDelay:Infinity});let headers=null;
 for await(const line of rl){if(!headers){headers=csv(line);continue}const v=csv(line),o=Object.fromEntries(headers.map((h,i)=>[h,v[i]||""]));
   const text=[o["Object Name"],o["Title"],o["Culture"],o["Period"],o["Medium"],o["Classification"],o["Department"]].join(" ");
   if(!terms.test(text))continue;const id=o["Object ID"];if(!id)continue;
   add("met",id,"https://www.metmuseum.org/art/collection/search/"+id,"bulk-metadata",{title:o["Title"]||"",culture:o["Culture"]||"",classification:o["Classification"]||"",isPublicDomain:o["Is Public Domain"]==="True"});
   if(rows.length>=target)break;
 }
}
async function rijks(){
 const qs=["textile","embroidery","woven","costume","garment","fabric","carpet","rug","ornament","pattern","decorative art","lace","tapestry","brocade","ikat","batik"];
 for(const q of qs){let next="https://data.rijksmuseum.nl/search/collection?query="+encodeURIComponent(q)+"&imageAvailable=true&pageSize=100";let pages=0;
   while(next&&rows.length<target&&pages++<1000){const b=await json(next);const items=b.orderedItems||b.items||b.results||[];
     for(const x of items){const id=(x.id||x.identifier||x["@id"]||"").toString().split("/").pop();if(id)add("rijks",id,x.id||("https://id.rijksmuseum.nl/"+id),q,{title:x.title||x._label||""})}
     next=b.next||b.nextPage||b.view?.next||null;
     if(!next&&b.partOf?.next)next=b.partOf.next;
     if(typeof next==="object")next=next.id||next["@id"]||null;
     if(!items.length)break;
   }
 }
}
async function aic(){for(let page=1;page<=1000&&rows.length<target;page++){const b=await json("https://api.artic.edu/api/v1/artworks?limit=100&page="+page+"&fields=id,title,image_id,is_public_domain,classification_title,medium_display,department_title");for(const r of b.data||[]){const text=[r.title,r.classification_title,r.medium_display,r.department_title].filter(Boolean).join(" ");if(!r.is_public_domain||!r.image_id||!terms.test(text))continue;add("aic",r.id,"https://www.artic.edu/artworks/"+r.id,"metadata-filter",{title:r.title||"",imageId:r.image_id})}if(!(b.data||[]).length)break}}
async function cma(){for(let skip=0;skip<200000&&rows.length<target;skip+=1000){const b=await json("https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&limit=1000&skip="+skip);const recs=b.data||[];for(const r of recs){const text=[r.title,r.type_title,r.technique,r.tombstone].filter(Boolean).join(" ");if(!terms.test(text))continue;add("cma",r.id,"https://www.clevelandart.org/art/"+r.id,"metadata-filter",{title:r.title||""})}if(!recs.length)break}}
for(const fn of [metBulk,rijks,aic,cma]){try{await fn()}catch(e){console.error(e)}if(rows.length>=target)break}
fs.writeFileSync(out+"/candidate-250k.jsonl",rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
const bySource=Object.fromEntries([...new Set(rows.map(x=>x.source))].map(s=>[s,rows.filter(x=>x.source===s).length]));
fs.writeFileSync(out+"/candidate-250k-stats.json",JSON.stringify({target,count:rows.length,distinctSources:Object.keys(bySource).length,bySource,generatedAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({target,count:rows.length,bySource}));
if(rows.length<target)process.exitCode=2;
