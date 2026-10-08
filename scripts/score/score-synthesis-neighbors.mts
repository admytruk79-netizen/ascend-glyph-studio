import pg from "pg";
import sharp from "sharp";
import {embedImage,MODEL} from "./clip.mts";

const {Pool}=pg;
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
const limit=Number(process.env.CANDIDATE_EMBED_LIMIT??100);
const threshold=Number(process.env.NEAR_COPY_THRESHOLD??0.95);
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:2});
pool.on("error",()=>{});

const q=await pool.query(`
 select id,state,score,disposition
 from synthesis_candidate
 where state ? 'svg' and not (state ? 'clipOriginality')
 order by run_id,ordinal
 limit $1`,[limit]);

let scored=0,rejected=0,failed=0;
for(const row of q.rows){
 try{
  const svg=String(row.state?.svg||"");
  if(!svg)continue;
  const png=await sharp(Buffer.from(svg),{density:180}).resize({width:768,withoutEnlargement:true}).flatten({background:"#efe9dc"}).png().toBuffer();
  const v=await embedImage(png);
  const literal="["+Array.from(v,x=>Number(x).toFixed(7)).join(",")+"]";
  const nn=await pool.query(`
    select e.object_id,e.tradition,o.source_url,o.title,o.region,
           1-(e.embedding <=> $1::vector) as similarity
    from research_visual_embedding e
    join research_corpus_object o on o.id=e.object_id
    where e.model=$2
    order by e.embedding <=> $1::vector
    limit 5`,[literal,MODEL]);
  const nearest=nn.rows.map((x:any)=>({id:x.object_id,tradition:x.tradition,url:x.source_url,title:x.title,region:x.region,similarity:+Number(x.similarity).toFixed(5)}));
  const maxSim=nearest[0]?.similarity??0,tooClose=maxSim>=threshold;
  const payload={model:MODEL,threshold,maxSimilarity:maxSim,tooClose,nearest};
  const disposition=tooClose&&row.disposition==="candidate"?"rejected-clip-near-copy":row.disposition;
  const penalty=tooClose?100:Math.max(0,(maxSim-.86)*40);
  await pool.query(`update synthesis_candidate
    set state=jsonb_set(state,'{clipOriginality}',$2::jsonb,true),
        disposition=$3,
        score=score-$4
    where id=$1`,[row.id,JSON.stringify(payload),disposition,penalty]);
  scored++;if(tooClose)rejected++;
 }catch(e){failed++;console.log(JSON.stringify({candidate:row.id,error:String((e as Error).message).slice(0,160)}))}
}
console.log(JSON.stringify({model:MODEL,selected:q.rows.length,scored,rejected,failed,threshold}));
await pool.end();
