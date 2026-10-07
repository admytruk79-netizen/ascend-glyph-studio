import pg from "pg";
import http from "node:http";
import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";
import {critiqueRaster,type RasterCritique} from "../packages/tesseract-engine/src/raster-critic";
import {deriveCorpusCanon} from "../packages/tesseract-engine/src/corpus-canonical";
import {installCorpusCanon} from "../packages/tesseract-engine/src/ascend-primitives";

const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:3,idleTimeoutMillis:15000,connectionTimeoutMillis:15000,keepAlive:true});
pool.on("error",(err)=>{console.error(JSON.stringify({level:"warn",event:"db_pool_idle_disconnect",message:err.message}));});
const server=http.createServer(async(req,res)=>{
 res.setHeader("access-control-allow-origin","*");
 res.setHeader("access-control-allow-methods","GET,OPTIONS");
 if(req.method==="OPTIONS"){res.writeHead(204);res.end();return}
 try{
  if(req.url==="/canon"){
   const q=await pool.query(`select id,support,status,review_state,nearest_reference_distance,traditions,sources,paths,centroid,reviewer_note,reviewed_at from corpus_canonical order by support desc`);
   res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(q.rows));return;
  }
  const m=req.url?.match(/^\/canon\/([^/]+)\.svg$/);
  if(m){
   const q=await pool.query("select id,paths from corpus_canonical where id=$1",[m[1]]);
   if(!q.rows[0]){res.writeHead(404);res.end("not found");return}
   const paths=(q.rows[0].paths??[]) as string[];
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><g fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths.map(d=>`<path d="${d.replace(/"/g,"&quot;")}"/>`).join("")}</g></svg>`;
   res.writeHead(200,{"content-type":"image/svg+xml","cache-control":"no-store"});res.end(svg);return;
  }
  res.writeHead(200,{"content-type":"text/plain"});res.end("tesseract worker ready");
 }catch(e){res.writeHead(500,{"content-type":"application/json"});res.end(JSON.stringify({error:String((e as Error).message)}))}
});
server.listen(Number(process.env.PORT||10000),"0.0.0.0",()=>process.stdout.write(JSON.stringify({status:"listening",port:Number(process.env.PORT||10000)})+"\n"));

type Intent={concepts?:{id:string;weight:number}[];materialId?:string;zoneId?:string;mode?:PatternMode;paletteId?:string;complexity?:number};

async function claim(){
 const c=await pool.connect();
 try{
  await c.query("begin");
  const q=await c.query(`select r.*,e.batch_size,e.population,e.generations
   from synthesis_run r cross join engine_runtime e
   where (r.status in ('queued','created') or (r.status='running' and r.solver_version='3.0.0-corpus-visual' and not exists (select 1 from synthesis_candidate sc where sc.run_id=r.id))) and e.id='tesseract-v2' and e.enabled=true
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
async function loadApprovedCanon(){
 const q=await pool.query(`select id,version,support,traditions,sources,centroid,paths,nearest_reference_distance,provenance from corpus_canonical where review_state='approved' order by support desc`);
 return q.rows.map((r:any)=>({id:r.id,version:r.version,viewBox:"0 0 100 100" as const,paths:r.paths,centroid:r.centroid,support:r.support,traditions:r.traditions,sources:r.sources,nearestReferenceDistance:Number(r.nearest_reference_distance),status:"canonical" as const,provenance:r.provenance}));
}
async function loadLearnedGuidance(){
 const q=await pool.query("select body from learned_model where id='tesseract-learned-latest' limit 1");
 const body=q.rows[0]?.body;if(!body)return undefined;
 const traditions=Object.entries<any>(body.traditions??{});
 if(!traditions.length)return undefined;
 const total=traditions.reduce((s,[,v])=>s+Number(v.images||0),0)||1;
 const density=traditions.reduce((s,[,v])=>s+Number(v.density||0)*Number(v.images||0),0)/total;
 const tagScores=new Map<string,number>(),colorScores=new Map<string,number>();
 for(const [,v] of traditions){
  const w=Number(v.images||0)/total;
  for(const [k,x] of Object.entries<number>(v.tags??{}))tagScores.set(k,(tagScores.get(k)||0)+Number(x)*w);
  for(const sw of (v.palette??[]))colorScores.set(String(sw.hex),(colorScores.get(String(sw.hex))||0)+Number(sw.share||0)*w);
 }
 return {density,tags:[...tagScores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,weight])=>({id,weight})),palette:[...colorScores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([hex,weight])=>({hex,weight})),model:String(body.version||"tesseract-learned")};
}

async function persistCorpusCanon(canon:any[]){
 for(const x of canon){
  await pool.query(`insert into corpus_canonical(id,version,status,support,traditions,sources,centroid,paths,nearest_reference_distance,provenance,built_at)
   values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb,now())
   on conflict(id) do update set version=excluded.version,status=excluded.status,support=excluded.support,traditions=excluded.traditions,sources=excluded.sources,centroid=excluded.centroid,paths=excluded.paths,nearest_reference_distance=excluded.nearest_reference_distance,provenance=excluded.provenance,built_at=now()`,
   [x.id,x.version,x.status,x.support,JSON.stringify(x.traditions),JSON.stringify(x.sources),JSON.stringify(x.centroid),JSON.stringify(x.paths),x.nearestReferenceDistance,JSON.stringify(x.provenance)]);
 }
}

async function execute(run:any){
 const intent=(run.intent??{}) as Intent;
 const concepts=(intent.concepts??[]).sort((a,b)=>b.weight-a.weight).map(x=>x.id);
 const mode=(intent.mode??(intent.zoneId?.includes("sleeve")?"sleeve":"band")) as PatternMode;
 const corpusSignals=await loadCorpusSignals(run.seed);
 const learnedGuidance=await loadLearnedGuidance();
 process.stdout.write(JSON.stringify({runId:run.id,stage:"corpus-signals-loaded",signals:corpusSignals.length})+"\n");
 const visualCorpus=await loadVisualCorpus(run.seed);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"visual-corpus-loaded",observations:visualCorpus.length})+"\n");
 const canon=deriveCorpusCanon(visualCorpus,{count:16,minTraditions:4,minSources:8,minSupport:24,minReferenceDistance:.035});
 await persistCorpusCanon(canon);
 const approvedCanon=await loadApprovedCanon();
 installCorpusCanon(approvedCanon);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"corpus-canon-derived",canonical:canon.filter(x=>x.status==="canonical").length,total:canon.length})+"\n");
 const patterns=generatePatterns({seed:run.seed,concepts,paletteId:intent.paletteId,mode,complexity:intent.complexity??.72,variations:run.batch_size??12,width:960,height:260,population:run.population,generations:run.generations,corpusSignals,visualCorpus,learnedGuidance});
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
 // Generation takes minutes of CPU; meanwhile Neon may suspend the idle compute and drop connections.
 // Save on a fresh connection with its own error handler (an unhandled client 'error' kills the process),
 // retrying with backoff while the compute wakes up.
 for(let attempt=1;;attempt++){
  try{return await persist(run,judged,intent,mode,concepts,corpusSignals,visualCorpus.length)}
  catch(e){
   const msg=String((e as Error).message);
   process.stdout.write(JSON.stringify({runId:run.id,stage:"persist-retry",attempt,message:msg.slice(0,160)})+"\n");
   if(attempt>=5){await pool.query("update synthesis_run set status='failed' where id=$1",[run.id]).catch(()=>{});throw e}
   await new Promise(r=>setTimeout(r,2000*2**attempt));
  }
 }
}
async function persist(run:any,judged:{p:any;raster:RasterCritique|null;score:number}[],intent:Intent,mode:PatternMode,concepts:string[],corpusSignals:unknown[],visualCorpusCount:number){
 const c=await pool.connect();
 c.on("error",(err)=>process.stdout.write(JSON.stringify({level:"warn",event:"db_client_error",runId:run.id,message:err.message})+"\n"));
 try{
  await c.query("begin");
  await c.query("delete from synthesis_candidate where run_id=$1",[run.id]);
  for(let i=0;i<judged.length;i++){
   const {p,raster,score}=judged[i]!;
   const state={patternId:p.id,lineageId:p.lineageId,svg:p.svg,objectives:p.objectives,raster,mode,concepts,corpusSignals,visualCorpusCount,corpusObjectCount:28265};
   const complexity={target:intent.complexity??.72,novelty:p.novelty};
   const disposition=raster&&!raster.survive?"rejected-raster":"candidate";
   await c.query(`insert into synthesis_candidate(id,run_id,ordinal,state,complexity,score,disposition)
    values(gen_random_uuid(),$1,$2,$3::jsonb,$4::jsonb,$5,$6)`,[run.id,i,JSON.stringify(state),JSON.stringify(complexity),score,disposition]);
  }
  await c.query("update synthesis_run set status='completed' where id=$1",[run.id]);
  await c.query("commit");
  return judged.length;
 }catch(e){await c.query("rollback").catch(()=>{});throw e}finally{c.release(true)}
}
async function main(){
 const bootstrapVisual=await loadVisualCorpus("corpus-canonical-bootstrap-v1");
 const bootstrapCanon=deriveCorpusCanon(bootstrapVisual,{count:16,minTraditions:4,minSources:8,minSupport:24,minReferenceDistance:.02});
 await persistCorpusCanon(bootstrapCanon);
 const approvedCanon=await loadApprovedCanon();
 installCorpusCanon(approvedCanon);
 process.stdout.write(JSON.stringify({stage:"corpus-canon-bootstrap",observations:bootstrapVisual.length,canonical:bootstrapCanon.filter(x=>x.status==="canonical").length,total:bootstrapCanon.length})+"\n");
 // Keep polling: new runs are queued automatically (daily designs workflow) and must be picked up without a
 // redeploy. A failed claim (e.g. Neon waking up) waits and tries again instead of ending the worker.
 const poll=Number(process.env.WORKER_POLL_MS??30000);
 let done=0,idleLogged=false;
 for(;;){
  let run:any=null;
  try{run=await claim()}catch(e){process.stdout.write(JSON.stringify({level:"warn",event:"claim_failed",message:String((e as Error).message).slice(0,160)})+"\n")}
  if(!run){if(!idleLogged){process.stdout.write(JSON.stringify({status:"idle",candidatesPersisted:done,pollMs:poll})+"\n");idleLogged=true}await new Promise(r=>setTimeout(r,poll));continue}
  idleLogged=false;
  try{const n=await execute(run);done+=n;process.stdout.write(JSON.stringify({runId:run.id,candidates:n,status:"completed"})+"\n")}
  catch(e){
   process.stdout.write(JSON.stringify({level:"error",runId:run.id,event:"run_failed",message:String((e as Error).message).slice(0,200)})+"\n");
   // mark it failed, or the claim query (running with no candidates) would pick the same run up forever
   await pool.query("update synthesis_run set status='failed' where id=$1",[run.id]).catch(()=>{});
  }
 }
}
main().catch(async e=>{console.error(e);await pool.end();process.exitCode=1});
