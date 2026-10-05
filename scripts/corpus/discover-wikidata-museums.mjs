import fs from"node:fs";
const out="packages/tesseract-engine/data/generated";fs.mkdirSync(out,{recursive:true});
const target=Math.max(1000,Number(process.env.TARGET||10000)),pageSize=500;
const rows=[],seen=new Set();let offset=0;
const endpoint="https://query.wikidata.org/sparql";
while(rows.length<target){
 const q=`SELECT ?item ?itemLabel ?website ?countryLabel WHERE {
   ?item wdt:P31/wdt:P279* wd:Q33506; wdt:P856 ?website.
   OPTIONAL { ?item wdt:P17 ?country. }
   SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
 } LIMIT ${pageSize} OFFSET ${offset}`;
 const url=endpoint+"?format=json&query="+encodeURIComponent(q);
 const r=await fetch(url,{headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.0 (research source discovery)","Accept":"application/sparql-results+json"}});
 if(!r.ok)throw new Error("Wikidata SPARQL "+r.status);
 const b=await r.json(),bindings=b.results?.bindings||[];if(!bindings.length)break;
 for(const x of bindings){
   try{
     const u=new URL(x.website?.value||""); if(!/^https?:$/.test(u.protocol))continue;
     const host=u.hostname.toLowerCase().replace(/^www\./,""); if(seen.has(host))continue;seen.add(host);
     rows.push({id:"wikidata:"+((x.item?.value||"").split("/").pop()||host),name:x.itemLabel?.value||host,url:u.origin+"/",country:x.countryLabel?.value||"",kind:"museum-candidate",status:"candidate",discoveredFrom:"Wikidata P31 museum / P856 official website"});
     if(rows.length>=target)break;
   }catch{}
 }
 offset+=pageSize;console.log({offset,candidates:rows.length});
 await new Promise(r=>setTimeout(r,800));
}
fs.writeFileSync(out+"/world-source-candidates.wikidata.json",JSON.stringify({version:"wikidata-museum-sites-v1",target,count:rows.length,generatedAt:new Date().toISOString(),items:rows},null,2)+"\n");
console.log({count:rows.length,target});
if(rows.length<1000)process.exitCode=2;
