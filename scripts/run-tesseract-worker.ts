import pg from "pg";
import http from "node:http";
import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";
import {critiqueRaster,type RasterCritique} from "../packages/tesseract-engine/src/raster-critic";

const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:3,idleTimeoutMillis:15000,connectionTimeoutMillis:15000,keepAlive:true});
pool.on("error",(err)=>{console.error(JSON.stringify({level:"warn",event:"db_pool_idle_disconnect",message:err.message}));});
const server=http.createServer((_req,res)=>{res.writeHead(200,{"content-type":"text/plain"});res.end("tesseract worker ready");});
server.listen(Number(process.env.PORT||10000),"0.0.0.0",()=>process.stdout.write(JSON.stringify({status:"listening",port:Number(process.env.PORT||10000)})+"\n"));

type Intent={concepts?:{id:string;weight:number}[];materialId?:string;zoneId?:string;mode?:PatternMode;paletteId?:string;complexity?:number};

async function claim(){
 const c=await pool.connect();
 try{
  await c.query("begin");
  const q=await c.query(`select r.*,e.batch_size,e.population,e.generations
   from synthesis_run r cross join engine_runtime e
   where (r.status in ('queued','created') or (r.status='running' and not exists (select 1 from synthesis_candidate sc where sc.run_id=r.id))) and e.id='tesseract-v2' and e.enabled=true
   order by r.created_at for update of r skip locked limit 1`);
  const run=q.rows[0]; if(!run){await c.query("rollback");return null}
  await c.query("update synthesis_run set status='running' where id=$1",[run.id]);
  await c.query("commit"); return run;
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}
async function loadCorpusSignals(seed:string){
 const q=await pool.query(`select id,source_key,tradition,region,material,technique,reliability,cultural_access
 from research_corpus_object where cultural_access in ('open','structure-only') order by md5(id || $1)`,[seed]);
 const m=new Map<string,{score:number;ids:string[]}>();
 for(const r of q.rows){
  const access=r.cultural_access==="open"?1:.7,rel=Number(r.reliability||.5);
  for(const raw of [r.tradition,r.region,r.material,r.technique]){
   for(const part of String(raw||"").split(/[;,/|]+/)){
    const id=part.trim().toLowerCase(); if(id.length<3)continue;
    const v=m.get(id)||{score:0,ids:[]};v.score+=rel*access;if(v.ids.length<16)v.ids.push(r.id);m.set(id,v);
   }
  }
 }
 return [...m.entries()].sort((a,b)=>b[1].score-a[1].score).slice(0,96).map(([id,v])=>({id,weight:Math.min(1,.15+Math.log1p(v.score)/8),sourceIds:v.ids}));
}
async function loadVisualCorpus(seed:string){
 const q=await pool.query(`select a.id,a.source_key,a.tradition,a.kind,a.features,a.deconstruction,o.cultural_access,o.reliability
 from research_corpus_analysis a join research_corpus_object o on o.id=a.id
 where o.cultural_access in ('open','structure-only') and a.features <> '{}'::jsonb
 order by md5(a.id || $1)`,[seed]);
 return q.rows.map((r:any)=>{const f=r.features||{},d=r.deconstruction||{},dirs:string[]=[];
  if(f.dominantAxis==="horizontal")dirs.push("horizontal"); else if(f.dominantAxis==="vertical")dirs.push("vertical"); else dirs.push("field");
  if(Number(f.radiality||0)>.48)dirs.push("radial"); if(r.kind==="frieze"||r.kind==="band")dirs.push("wrap");
  const ops:string[]=[]; if(Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0))>.45)ops.push("repeat");
  if(Math.abs(Number(f.mirrorX||0)-Number(f.mirrorY||0))>.12||Number(f.densityVariation||0)>.55)ops.push("interrupt");
  if(Number(f.radiality||0)>.5)ops.push("branch");
  const scale=Array.isArray(f.scaleHierarchy)?f.scaleHierarchy.length:1;
  return {id:r.id,sourceRef:r.source_key,class:"real-historical" as const,evidenceTier:Number(r.reliability||0)>=.85?"A" as const:"B" as const,verifiedReal:true,trainingUse:"composition" as const,
   features:{symmetry:(Number(f.mirrorX||.5)+Number(f.mirrorY||.5)+Number(f.rotation180||.5))/3,density:Number(f.edgeDensity||.5),voidRatio:Number(f.voidRatio||.5),scaleLevels:scale,dominantDirection:dirs,operations:ops,
    densityVariation:Number(f.densityVariation||.5),directionalEntropy:Array.isArray(f.orientation)?(()=>{const xs=f.orientation.map((x:any)=>Number(x||0)),sum=xs.reduce((a:number,b:number)=>a+b,0)||1;return -xs.reduce((h:number,x:number)=>{const p=x/sum;return p>0?h+p*Math.log(p):h},0)/Math.log(Math.max(2,xs.length))})():.5,
    axisStrength:Number(f.axisStrength||.5),rotation180:Number(f.rotation180||.5),periodicity:Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0)),
    focalDominance:Math.max(0,Math.min(1,(scale>1?.55:.25)+Number(f.densityVariation||0)*.35+(1-Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0)))*.1)),
    asymmetryBalance:Math.max(0,Math.min(1,Math.abs(Number(f.mirrorX||.5)-Number(f.mirrorY||.5))*1.5+Number(f.densityVariation||0)*.35)),
    motifFieldRatio:Number(d?.scale?.motif||.5),compositionalDepth:Math.max(0,Math.min(1,(scale/5)*.45+Number(f.densityVariation||0)*.35+Number(f.radiality||0)*.2)),
    embroideryComplexity:Math.max(0,Math.min(1,Number(f.edgeDensity||.5)*.35+Number(f.densityVariation||.5)*.25+(scale/5)*.2+Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0))*.2))},notes:[r.kind||"unknown",r.tradition||"unknown"],provenance:r.id};
 });
}
async function execute(run:any){
 const intent=(run.intent??{}) as Intent;
 const concepts=(intent.concepts??[]).sort((a,b)=>b.weight-a.weight).map(x=>x.id);
 const mode=(intent.mode??(intent.zoneId?.includes("sleeve")?"sleeve":"band")) as PatternMode;
 const corpusSignals=await loadCorpusSignals(run.seed);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"corpus-signals-loaded",signals:corpusSignals.length})+"\n");
 const visualCorpus=await loadVisualCorpus(run.seed);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"visual-corpus-loaded",observations:visualCorpus.length})+"\n");
 const patterns=generatePatterns({seed:run.seed,concepts,paletteId:intent.paletteId,mode,complexity:intent.complexity??.72,variations:run.batch_size??12,width:960,height:260,population:run.population,generations:run.generations,corpusSignals,visualCorpus});
 process.stdout.write(JSON.stringify({runId:run.id,stage:"generation-complete",patterns:patterns.length})+"\n");
 // judge the rendered design, not its SVG text: tangles, overfilled or empty bands are rejected (kept with reasons)
 const judged:{p:(typeof patterns)[number];raster:RasterCritique|null;score:number}[]=[];
 for(const p of patterns){
  let raster:RasterCritique|null=null;
  try{raster=await critiqueRaster(p.svg)}catch(e){process.stdout.write(JSON.stringify({runId:run.id,stage:"raster-critic-error",pattern:p.id,message:String((e as Error).message).slice(0,120)})+"\n")}
  judged.push({p,raster,score:p.score+(raster?raster.quality*60-(raster.survive?0:80):0)});
 }
 judged.sort((a,b)=>Number(b.raster?.survive??false)-Number(a.raster?.survive??false)||b.score-a.score);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"raster-critic",passed:judged.filter(j=>j.raster?.survive).length,of:judged.length})+"\n");
 const c=await pool.connect();
 try{
  await c.query("begin");
  await c.query("delete from synthesis_candidate where run_id=$1",[run.id]);
  for(let i=0;i<judged.length;i++){
   const {p,raster,score}=judged[i]!;
   const state={patternId:p.id,lineageId:p.lineageId,svg:p.svg,objectives:p.objectives,raster,mode,concepts,corpusSignals,visualCorpusCount:visualCorpus.length,corpusObjectCount:28265};
   const complexity={target:intent.complexity??.72,novelty:p.novelty};
   const disposition=raster&&!raster.survive?"rejected-raster":"candidate";
   await c.query(`insert into synthesis_candidate(id,run_id,ordinal,state,complexity,score,disposition)
    values(gen_random_uuid(),$1,$2,$3::jsonb,$4::jsonb,$5,$6)`,[run.id,i,JSON.stringify(state),JSON.stringify(complexity),score,disposition]);
  }
  await c.query("update synthesis_run set status='completed' where id=$1",[run.id]);
  await c.query("commit");
  return judged.length;
 }catch(e){await c.query("rollback");await pool.query("update synthesis_run set status='failed' where id=$1",[run.id]);throw e}finally{c.release()}
}
async function main(){
 let done=0;
 for(;;){const run=await claim();if(!run)break;const n=await execute(run);done+=n;process.stdout.write(JSON.stringify({runId:run.id,candidates:n,status:"completed"})+"\n")}
 process.stdout.write(JSON.stringify({ok:true,candidatesPersisted:done})+"\n");
 await pool.end();
}
main().catch(async e=>{console.error(e);await pool.end();process.exitCode=1});
