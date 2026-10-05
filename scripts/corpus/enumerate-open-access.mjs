import fs from"node:fs";import path from"node:path";
const source=process.env.SOURCE||"cma",limit=Math.max(1,Number(process.env.LIMIT||10000)),out=".corpus-out";fs.mkdirSync(out,{recursive:true});
const terms=/textile|embroider|weav|woven|bead|quill|cloth|costume|garment|tapestry|needlework|lace|appliqu|quilt|rug|carpet/i;
let accepted=0,seen=0,page=1;const file=fs.createWriteStream(path.join(out,source+".jsonl"));
const keep=(r)=>terms.test([r.title,r.type_title,r.classification_title,r.medium_display,r.description,r.technique,r.department_title,r.tombstone].filter(Boolean).join(" "));
while(accepted<limit){
 let url;if(source==="cma")url=`https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&limit=1000&skip=${(page-1)*1000}`;
 else url=`https://api.artic.edu/api/v1/artworks?limit=100&page=${page}&fields=id,title,image_id,is_public_domain,classification_title,medium_display,description,department_title,artwork_type_title`;
 const res=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.0"}});if(!res.ok)throw new Error(`${source} ${res.status}`);const body=await res.json();const rows=body.data||[];if(!rows.length)break;
 for(const r of rows){seen++;if(source==="aic"&&(!r.is_public_domain||!r.image_id))continue;if(!keep(r))continue;const image=source==="aic"?`https://www.artic.edu/iiif/2/${r.image_id}/full/843,/0/default.jpg`:(r.images?.web?.url||r.images?.print?.url||r.images?.full?.url);if(!image)continue;file.write(JSON.stringify({source,objectId:String(r.id),title:r.title||"",image,rights:"open-access",raw:r})+"\n");if(++accepted>=limit)break}page++;if(source==="aic")await new Promise(r=>setTimeout(r,1000));
}
file.end();fs.writeFileSync(path.join(out,source+"-stats.json"),JSON.stringify({source,seen,accepted,pages:page-1,target:limit},null,2));console.log({source,seen,accepted,pages:page-1});
