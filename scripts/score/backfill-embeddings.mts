import pg from "pg";
import {embedImage,MODEL} from "./clip.mts";
import {USER_AGENT} from "../corpus/sources.ts";

const {Pool}=pg;
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
const max=Number(process.env.EMBED_MAX??5000);
const deadline=Date.now()+Number(process.env.EMBED_MAX_MINUTES??160)*60_000;
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:2});
pool.on("error",()=>{});

const q=await pool.query(`
 select o.id,o.image_url,a.split,o.tradition
 from research_corpus_object o
 join research_corpus_analysis a on a.id=o.id
 left join research_visual_embedding e on e.object_id=o.id and e.model=$1
 where o.image_url is not null
   and o.cultural_access in ('open','structure-only')
   and e.object_id is null
 order by case a.split when 'holdout' then 0 when 'validation' then 1 else 2 end, md5(o.id)
 limit $2`,[MODEL,max]);

let done=0,failed=0;
const lastHit=new Map<string,number>();
async function get(url:string){
 const host=new URL(url).host,wait=(lastHit.get(host)??0)+350-Date.now();
 if(wait>0)await new Promise(r=>setTimeout(r,wait));lastHit.set(host,Date.now());
 const h:Record<string,string>={"user-agent":USER_AGENT,accept:"image/jpeg,image/png,image/*;q=0.8"};
 if(url.includes("artic.edu"))h["AIC-User-Agent"]=USER_AGENT;
 const res=await fetch(url,{headers:h,signal:AbortSignal.timeout(25_000)});
 if(!res.ok)throw new Error(String(res.status));
 return new Uint8Array(await res.arrayBuffer());
}
for(const r of q.rows){
 if(Date.now()>deadline)break;
 try{
  const v=await embedImage(await get(r.image_url));
  const literal="["+Array.from(v,x=>Number(x).toFixed(7)).join(",")+"]";
  await pool.query(`insert into research_visual_embedding(object_id,model,split,tradition,embedding,built_at)
    values($1,$2,$3,$4,$5::vector,now())
    on conflict(object_id,model) do update set split=excluded.split,tradition=excluded.tradition,embedding=excluded.embedding,built_at=now()`,
    [r.id,MODEL,r.split??null,r.tradition??null,literal]);
  done++;
  if(done%100===0)console.log(JSON.stringify({embedded:done,failed,remaining:q.rows.length-done-failed}));
 }catch(e){failed++;if(failed<=10)console.log(JSON.stringify({failed:r.id,error:String((e as Error).message).slice(0,100)}))}
}
console.log(JSON.stringify({model:MODEL,selected:q.rows.length,embedded:done,failed}));
await pool.end();
