/**
 * Bulk research-corpus ingestion. Target scale: 250,000+ object records.
 * Streams paginated museum/archive APIs; never hand-curates individual objects.
 */
import {createWriteStream} from "node:fs";
type Source={id:string;endpoint:string;query:string;tradition:string;culturalAccess:"open"|"review"};
const sources:Source[]=[
 {id:"met-ukrainian",endpoint:"https://collectionapi.metmuseum.org/public/collection/v1/search",query:"Ukraine Ukrainian embroidery textile weaving folk art",tradition:"Ukrainian",culturalAccess:"open"},
 {id:"met-western",endpoint:"https://collectionapi.metmuseum.org/public/collection/v1/search",query:"American West western saddle leatherwork cowboy horse tack",tradition:"American Western",culturalAccess:"open"}
];
const target=Number(process.env.CORPUS_TARGET??250000),out=process.env.CORPUS_OUT??"data/research/corpus.ndjson";
const mode=process.env.CORPUS_MODE??"broad";
const checkpointEvery=Number(process.env.CORPUS_CHECKPOINT_EVERY??1000);
const seen=new Set<string>();
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function json(url:string){const r=await fetch(url,{headers:{"user-agent":"ASCEND-Research-Corpus/0.1"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()}
async function* met(s:Source){const q=await json(`${s.endpoint}?hasImages=true&q=${encodeURIComponent(s.query)}`);for(const id of q.objectIDs??[]){const x=await json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);yield{id:`met-${id}`,source:s.id,tradition:s.tradition,culturalAccess:s.culturalAccess,title:x.title,creator:x.artistDisplayName||undefined,date:x.objectDate||undefined,region:x.country||x.culture||undefined,material:x.medium||undefined,technique:x.classification||undefined,objectURL:x.objectURL,image:x.primaryImageSmall||undefined,rights:x.rightsAndReproduction||undefined,accession:x.accessionNumber,reliability:.98,raw:{department:x.department,culture:x.culture,period:x.period,dynasty:x.dynasty}};await sleep(35)}}
async function main(){
 const stream=createWriteStream(out,{flags:"w"});let n=0;
 for(const s of sources){
  for await(const row of met(s)){
   if(seen.has(row.id))continue;
   seen.add(row.id);
   stream.write(JSON.stringify(row)+"\n");
   n++;
   if(n%checkpointEvery===0)console.log(JSON.stringify({checkpoint:n,target,out}));
   if(n>=target)break;
  }
  if(n>=target)break;
 }
 stream.end();
 console.log(JSON.stringify({written:n,target,out,unique:seen.size}))
}
main().catch(e=>{console.error(e);process.exitCode=1});
