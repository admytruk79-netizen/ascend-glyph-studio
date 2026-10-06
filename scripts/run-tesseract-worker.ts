import pg from "pg";
import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";

const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});

type Intent={concepts?:{id:string;weight:number}[];materialId?:string;zoneId?:string;mode?:PatternMode;paletteId?:string;complexity?:number};

async function claim(){
 const c=await pool.connect();
 try{
  await c.query("begin");
  const q=await c.query(`select r.*,e.batch_size,e.population,e.generations
   from synthesis_run r cross join engine_runtime e
   where r.status in ('queued','created') and e.id='tesseract-v2' and e.enabled=true
   order by r.created_at for update of r skip locked limit 1`);
  const run=q.rows[0]; if(!run){await c.query("rollback");return null}
  await c.query("update synthesis_run set status='running' where id=$1",[run.id]);
  await c.query("commit"); return run;
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}
async function execute(run:any){
 const intent=(run.intent??{}) as Intent;
 const concepts=(intent.concepts??[]).sort((a,b)=>b.weight-a.weight).map(x=>x.id);
 const mode=(intent.mode??(intent.zoneId?.includes("sleeve")?"sleeve":"band")) as PatternMode;
 const patterns=generatePatterns({seed:run.seed,concepts,paletteId:intent.paletteId,mode,complexity:intent.complexity??.72,variations:run.batch_size??12,width:960,height:260});
 const c=await pool.connect();
 try{
  await c.query("begin");
  await c.query("delete from synthesis_candidate where run_id=$1",[run.id]);
  for(let i=0;i<patterns.length;i++){
   const p=patterns[i]!;
   const state={patternId:p.id,lineageId:p.lineageId,svg:p.svg,objectives:p.objectives,mode,concepts};
   const complexity={target:intent.complexity??.72,novelty:p.novelty};
   await c.query(`insert into synthesis_candidate(id,run_id,ordinal,state,complexity,score,disposition)
    values(gen_random_uuid(),$1,$2,$3::jsonb,$4::jsonb,$5,'candidate')`,[run.id,i,JSON.stringify(state),JSON.stringify(complexity),p.score]);
  }
  await c.query("update synthesis_run set status='completed' where id=$1",[run.id]);
  await c.query("commit");
  return patterns.length;
 }catch(e){await c.query("rollback");await pool.query("update synthesis_run set status='failed' where id=$1",[run.id]);throw e}finally{c.release()}
}
async function main(){
 let done=0;
 for(;;){const run=await claim();if(!run)break;const n=await execute(run);done+=n;process.stdout.write(JSON.stringify({runId:run.id,candidates:n,status:"completed"})+"\n")}
 process.stdout.write(JSON.stringify({ok:true,candidatesPersisted:done})+"\n");
 await pool.end();
}
main().catch(async e=>{console.error(e);await pool.end();process.exitCode=1});
