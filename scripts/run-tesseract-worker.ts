import pg from "pg";
import http from "node:http";
import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";
import {critiqueRaster,type RasterCritique} from "../packages/tesseract-engine/src/raster-critic";
import {deriveStructuralFeedback,type StructuralFeedback} from "../packages/tesseract-engine/src/structural-feedback";
import {deriveCorpusCanon} from "../packages/tesseract-engine/src/corpus-canonical";
import {installCorpusCanon} from "../packages/tesseract-engine/src/ascend-primitives";
import {machineTemplate} from "../packages/tesseract-engine/src/machine-template";
import {compileProductionIr,recipes,type ProductionStitchIrObject} from "../packages/stitch-engine/src/index";
import {BRICKS} from "../packages/blend-engine/src/lego";

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
   const q=await pool.query(`select id,support,status,review_state,nearest_reference_distance,traditions,sources,paths,centroid,provenance,reviewer_note,reviewed_at from corpus_canonical order by support desc`);
   const rows=[];
   for(const row of q.rows){
    const ids=Array.isArray(row.provenance?.observationIds)?row.provenance.observationIds.slice(0,8):[];
    let evidence:any[]=[];
    if(ids.length){
     const e=await pool.query(`select id,source_key,title,creator,date_label,tradition,region,material,technique,image_url,source_url,rights,cultural_access,reliability
      from research_corpus_object where id=any($1::text[]) order by array_position($1::text[],id)`,[ids]);
     evidence=e.rows;
    }
    rows.push({...row,evidence});
   }
   res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(rows));return;
  }
  const m=req.url?.match(/^\/canon\/([^/]+)\.svg$/);
  if(m){
   const q=await pool.query("select id,paths from corpus_canonical where id=$1",[m[1]]);
   if(!q.rows[0]){res.writeHead(404);res.end("not found");return}
   const paths=(q.rows[0].paths??[]) as string[];
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><g fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths.map(d=>`<path d="${d.replace(/"/g,"&quot;")}"/>`).join("")}</g></svg>`;
   res.writeHead(200,{"content-type":"image/svg+xml","cache-control":"no-store"});res.end(svg);return;
  }
  const runMatch=req.url?.match(/^\/runs\/([0-9a-f-]{36})$/i);
  if(runMatch){
   const runId=runMatch[1]!;
   const rq=await pool.query("select id,seed,solver_version,intent,status,created_at from synthesis_run where id=$1",[runId]);
   if(!rq.rows[0]){res.writeHead(404);res.end("not found");return}
   const cq=await pool.query(`select ordinal,score,disposition,
     state->>'patternId' pattern_id,state->>'lineageId' lineage_id,
     coalesce((state->>'feedbackPass')::int,0) feedback_pass,
     state->'raster' raster,state->'finalCritique' final_critique,
     state->>'visualCorpusCount' visual_corpus_count,state->>'corpusObjectCount' corpus_object_count
     from synthesis_candidate where run_id=$1 order by ordinal`,[runId]);
   const rows=cq.rows.map((x:any)=>({...x,svgUrl:`/runs/${runId}/${x.ordinal}.svg`}));
   res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
   res.end(JSON.stringify({run:rq.rows[0],candidates:rows}));return;
  }
  const svgMatch=req.url?.match(/^\/runs\/([0-9a-f-]{36})\/(\d+)\.svg$/i);
  if(svgMatch){
   const q=await pool.query("select state->>'svg' svg from synthesis_candidate where run_id=$1 and ordinal=$2",[svgMatch[1],Number(svgMatch[2])]);
   if(!q.rows[0]?.svg){res.writeHead(404);res.end("not found");return}
   res.writeHead(200,{"content-type":"image/svg+xml","cache-control":"no-store"});res.end(q.rows[0].svg);return;
  }
  res.writeHead(200,{"content-type":"text/plain"});res.end("tesseract worker ready");
 }catch(e){res.writeHead(500,{"content-type":"application/json"});res.end(JSON.stringify({error:String((e as Error).message)}))}
});
server.listen(Number(process.env.PORT||10000),"0.0.0.0",()=>process.stdout.write(JSON.stringify({status:"listening",port:Number(process.env.PORT||10000)})+"\n"));

type Intent={concepts?:{id:string;weight:number}[];materialId?:string;recipeId?:string;zoneId?:string;mode?:PatternMode;paletteId?:string;complexity?:number;machineProfileId?:string;physicalWidthMm?:number;physicalHeightMm?:number;constructionIntent?:{targetOccupancy?:number;seamPolicy?:"avoid"|"continuous"|"resolve";maxColors?:number;hierarchyDepth?:number}};

async function claim(){
 const c=await pool.connect();
 try{
  await c.query("begin");
  const exact=process.env.WORKER_RUN_ID;
  const q=exact
   ?await c.query(`select r.*,e.batch_size,e.population,e.generations
      from synthesis_run r cross join engine_runtime e
      where r.id=$1 and r.status in ('staging-created','queued','created') and e.id='tesseract-v2' and e.enabled=true
      for update of r skip locked limit 1`,[exact])
   :await c.query(`select r.*,e.batch_size,e.population,e.generations
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
 const q=await pool.query(`
 with ranked as (
   select a.id,a.source_key,a.source_url,a.tradition,a.kind,a.features,a.deconstruction,o.cultural_access,o.reliability,
          row_number() over(partition by coalesce(nullif(a.tradition,''),'unknown') order by md5(a.id || $1)) rn
   from research_corpus_analysis a join research_corpus_object o on o.id=a.id
   where o.cultural_access in ('open','structure-only')
     and a.features <> '{}'::jsonb
     and coalesce(a.split,'train') <> 'holdout'
 )
 select id,source_key,source_url,tradition,kind,features,deconstruction,cultural_access,reliability
 from ranked where rn <= 32
 order by md5(id || $1)
 limit 4096`,[seed]);
 return q.rows.map((r:any)=>{const f=r.features||{},d=r.deconstruction||{},dirs:string[]=[];
  if(f.dominantAxis==="horizontal")dirs.push("horizontal"); else if(f.dominantAxis==="vertical")dirs.push("vertical"); else dirs.push("field");
  if(Number(f.radiality||0)>.48)dirs.push("radial"); if(r.kind==="frieze"||r.kind==="band")dirs.push("wrap");
  const ops:string[]=[]; if(Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0))>.45)ops.push("repeat");
  if(Math.abs(Number(f.mirrorX||0)-Number(f.mirrorY||0))>.12||Number(f.densityVariation||0)>.55)ops.push("interrupt");
  if(Number(f.radiality||0)>.5)ops.push("branch");
  const scale=Array.isArray(f.scaleHierarchy)?f.scaleHierarchy.length:1;
  return {id:r.id,sourceRef:r.source_url||r.source_key,class:"real-historical" as const,evidenceTier:Number(r.reliability||0)>=.85?"A" as const:"B" as const,verifiedReal:true,trainingUse:"composition" as const,
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
 const lego=body.lego?.all??{},pairs=Object.values<any>(lego.pairs??{}),repeats=Object.values<any>(lego.repeats??{});
 const repeatStrength=repeats.length?repeats.reduce((s:any,x:any)=>s+Number(x.regularity||0),0)/repeats.length:0;
 const mirrorStrength=Math.max(0,Math.min(1,(Number(lego.mirrorV||0)+Number(lego.mirrorH||0))/2));
 const ratios=pairs.map((x:any)=>Number(x.ratio||1)).filter((x:number)=>Number.isFinite(x)&&x>0).sort((a:number,b:number)=>a-b);
 const preferredScaleRatio=ratios.length?ratios[Math.floor(ratios.length/2)]!:1;
 const pairDensity=Math.min(1,pairs.length/240),exploration=Math.max(.05,Math.min(.9,Number(lego.novelShare??.25)));
 const relationPrior={
  relationWeights:{anchor:.25,flow:.35+repeatStrength*1.3,repeat:.25+repeatStrength*1.8,return:.2+repeatStrength,
   oppose:.18+mirrorStrength*1.4,enclose:.2+mirrorStrength,orbit:.2+mirrorStrength*.9,
   branch:.2+pairDensity*.9,bridge:.18+pairDensity*.7,nest:.18+pairDensity*.65,intersect:.14+pairDensity*.55,
   transform:.32+exploration*.7,radiate:.2+pairDensity*.45,ascend:.34,terminate:.12},
  preferredScaleRatio,mirrorStrength,repeatStrength,exploration,evidenceImages:Number(lego.images||0),sourceModel:String(body.version||"tesseract-learned")
 };
 type Role="hero"|"companion"|"filler"|"frame"|"connector";
 const roleOf=(id:string):Role=>{
  if(id==="border")return "frame";
  const b=(BRICKS as any)[id];
  if(b?.scale==="hero")return "hero";
  if(b?.scale==="companion")return "companion";
  if(b?.scale==="filler")return "filler";
  return "connector";
 };
 const roleWeights:Partial<Record<Role,number>>={};
 for(const [id,b] of Object.entries<any>(lego.bricks??{})){
  const r=roleOf(id);roleWeights[r]=(roleWeights[r]??0)+Math.max(.001,Number(b.share||0));
 }
 const adjacency:Partial<Record<Role,Partial<Record<Role,number>>>>={};
 let pairEvidence=0;
 for(const [key,v] of Object.entries<any>(lego.pairs??{})){
  const [a,b]=key.split("|"),ra=roleOf(a||""),rb=roleOf(b||"");
  const n=Math.max(0,Number(v.n||0));if(!n)continue;pairEvidence+=n;
  const row=(adjacency[ra]??={});row[rb]=(row[rb]??0)+n;
 }
 for(const row of Object.values(adjacency))if(row){
  const sum=Object.values(row).reduce((s,x)=>s+Number(x||0),0)||1;
  for(const k of Object.keys(row) as Role[])row[k]=Math.max(.0001,Number(row[k]||0)/sum);
 }
 const brickExtents=Object.values<any>(lego.bricks??{}).map(x=>Number(x.extent||0)).filter(x=>x>0).sort((a,b)=>a-b);
 const hierarchyStrength=brickExtents.length?Math.max(0,Math.min(1,(brickExtents.at(-1)!/(brickExtents[Math.floor(brickExtents.length/2)]||1)-1)/4)):0;
 const absDirs=Object.values<any>(lego.pairs??{}).map(x=>({x:Math.abs(Number(x.dx||0)),y:Math.abs(Number(x.dy||0)),n:Number(x.n||0)}));
 const dirTotal=absDirs.reduce((s,x)=>s+x.n,0)||1;
 const axialBias=absDirs.reduce((s,x)=>s+(Math.max(x.x,x.y)>=Math.min(x.x,x.y)*2?x.n:0),0)/dirTotal;
 const diagonalBias=absDirs.reduce((s,x)=>s+(Math.max(x.x,x.y)<Math.min(x.x,x.y)*2?x.n:0),0)/dirTotal;
 const regularities=Object.values<any>(lego.repeats??{}).map(x=>Number(x.regularity||0)).filter(Number.isFinite);
 const gaps=Object.values<any>(lego.repeats??{}).map(x=>Number(x.gap||0)).filter(x=>x>0);
 const median=(xs:number[])=>xs.length?[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]!:0;
 const logRatios=ratios.map((x:number)=>Math.abs(Math.log(x/preferredScaleRatio)));
 const assemblyPrior=body.assemblyPrior??{
  hierarchyStrength,adjacencyDensity:Math.min(1,pairs.length/360),axialBias,diagonalBias,
  repeatRegularity:regularities.length?regularities.reduce((a,b)=>a+b,0)/regularities.length:repeatStrength,
  repeatGap:median(gaps)||.15,scaleRatioMedian:preferredScaleRatio,scaleRatioSpread:median(logRatios)||.35,
  evidencePairs:pairEvidence,evidenceBricks:Object.keys(lego.bricks??{}).length,sourceModel:String(body.version||"tesseract-learned"),
  roleWeights,adjacency
 };
 return {density,tags:[...tagScores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,weight])=>({id,weight})),palette:[...colorScores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([hex,weight])=>({hex,weight})),model:String(body.version||"tesseract-learned"),relationPrior,assemblyPrior};
}

async function loadPreferenceModel(){
 const q=await pool.query("select feature_order,weights,bias,pair_count,metrics from preference_model where id='preference-latest' limit 1");
 return q.rows[0]??null;
}
function preferenceAdjustment(model:any,p:any,raster:any,baseScore:number){
 if(!model||Number(model.pair_count||0)<8)return 0;
 const f=p.finalCritique||{},cx=p.novelty??0;
 const raw:Record<string,number>={
  svgQuality:Number(f.quality||0),originality:Number(f.originality||0),genericRisk:Number(f.genericRisk||0),
  derivativeRisk:Number(f.derivativeRisk||0),rasterQuality:Number(raster?.quality||0),rasterBalance:Number(raster?.balance||0),
  novelty:Number(cx||0),baseScore:Number(baseScore||0)/100
 };
 const mean=model.metrics?.mean??[],sd=model.metrics?.sd??[];
 let z=Number(model.bias||0);
 for(let i=0;i<(model.feature_order??[]).length;i++){
  const name=model.feature_order[i],v=raw[name]??0,m=Number(mean[i]||0),s=Number(sd[i]||1)||1;
  z+=Number(model.weights?.[i]||0)*((v-m)/s);
 }
 return Math.max(-20,Math.min(20,z))*2.5;
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
 const preferenceModel=await loadPreferenceModel();
 process.stdout.write(JSON.stringify({runId:run.id,stage:"corpus-signals-loaded",signals:corpusSignals.length})+"\n");
 const visualCorpus=await loadVisualCorpus(run.seed);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"visual-corpus-loaded",observations:visualCorpus.length})+"\n");
 const approvedCanon=await loadApprovedCanon();
 installCorpusCanon(approvedCanon);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"canon-loaded",approved:approvedCanon.length})+"\n");
 const batchSize=run.batch_size??12;
 const judged:{p:any;raster:RasterCritique|null;score:number;feedbackPass:number}[]=[];
 const baseComplexity=Number(intent.complexity??.72);
 let structuralFeedback:StructuralFeedback|undefined;
 for(let feedbackPass=0;feedbackPass<3;feedbackPass++){
  const passComplexity=Math.max(.52,baseComplexity-feedbackPass*.07);
  const passSeed=feedbackPass===0?run.seed:run.seed+":feedback:"+feedbackPass;
  const patterns=generatePatterns({seed:passSeed,concepts,paletteId:intent.paletteId,mode,complexity:passComplexity,variations:batchSize,width:960,height:260,population:run.population,generations:run.generations,corpusSignals,visualCorpus,learnedGuidance,structuralFeedback,machineProfileId:intent.machineProfileId,physicalWidthMm:intent.physicalWidthMm,physicalHeightMm:intent.physicalHeightMm,constructionIntent:intent.constructionIntent});
  process.stdout.write(JSON.stringify({runId:run.id,stage:"generation-pass",feedbackPass,patterns:patterns.length,complexity:passComplexity})+"\n");
  let passed=0;
  for(const p of patterns){
   let raster:RasterCritique|null=null;
   try{raster=await critiqueRaster(p.svg)}catch(e){process.stdout.write(JSON.stringify({runId:run.id,stage:"raster-critic-error",pattern:p.id,message:String((e as Error).message).slice(0,120)})+"\n")}
   const base=p.score+(raster?raster.quality*60-(raster.survive?0:80):0);
   judged.push({p,raster,score:base+preferenceAdjustment(preferenceModel,p,raster,base),feedbackPass});
   if(raster?.survive)passed++;
  }
  const passRows=judged.filter(x=>x.feedbackPass===feedbackPass);
  structuralFeedback=deriveStructuralFeedback(passRows.map(x=>({raster:x.raster,finalCritique:x.p.finalCritique})));
  process.stdout.write(JSON.stringify({runId:run.id,stage:"critic-feedback",feedbackPass,passed,of:patterns.length,reasons:structuralFeedback.reasons,avoid:structuralFeedback.avoidRelations,centralHierarchyBoost:structuralFeedback.centralHierarchyBoost,repetitionReduction:structuralFeedback.repetitionReduction,crossingReduction:structuralFeedback.crossingReduction})+"\n");
  if(passed>=Math.min(3,Math.max(1,Math.ceil(batchSize/4))))break;
 }
 judged.sort((a,b)=>{
  const survival=Number(b.raster?.survive??false)-Number(a.raster?.survive??false);
  if(survival)return survival;
  if(!(a.raster?.survive)&&!(b.raster?.survive)&&a.feedbackPass!==b.feedbackPass)return b.feedbackPass-a.feedbackPass;
  return b.score-a.score;
 });
 judged.splice(batchSize);
 process.stdout.write(JSON.stringify({runId:run.id,stage:"raster-critic",passed:judged.filter(j=>j.raster?.survive).length,of:judged.length,preferencePairs:Number(preferenceModel?.pair_count||0)})+"\n");
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
async function corpusCount(){const q=await pool.query("select count(*)::int n from research_corpus_object where image_url is not null");return Number(q.rows[0]?.n||0)}
async function persist(run:any,judged:{p:any;raster:RasterCritique|null;score:number;feedbackPass:number}[],intent:Intent,mode:PatternMode,concepts:string[],corpusSignals:unknown[],visualCorpusCount:number){
 const c=await pool.connect();
 c.on("error",(err)=>process.stdout.write(JSON.stringify({level:"warn",event:"db_client_error",runId:run.id,message:err.message})+"\n"));
 try{
  await c.query("begin");
  await c.query("delete from synthesis_candidate where run_id=$1",[run.id]);
  const corpusObjectCount=await corpusCount();
  for(let i=0;i<judged.length;i++){
   const {p,raster,score,feedbackPass}=judged[i]!;
   let productionCompile:any=undefined;
   if(Array.isArray(p.stitchObjects)&&p.stitchObjects.length&&intent.recipeId&&p.machineProfileId){
    const recipe=recipes[intent.recipeId],machine=machineTemplate(p.machineProfileId);
    if(recipe&&machine){
     const compiled=compileProductionIr(p.stitchObjects as ProductionStitchIrObject[],recipe,{
      hoop:{name:machine.id,width:machine.fieldX.value,height:machine.fieldY.value},
      maxStitches:machine.maxPracticalStitches,maxMinutes:machine.maxContinuousRunMinutes
     });
     productionCompile={
      recipeId:recipe.id,machineId:machine.id,
      predictedStitches:compiled.math.predictedStitches,
      compiledStitches:compiled.realized.stitchCount,
      needleThreadM:compiled.math.needleThreadM,bobbinThreadM:compiled.math.bobbinThreadM,
      totalThreadM:compiled.math.totalThreadM,minutes:compiled.minutes,
      colors:compiled.plan.colors,trims:compiled.plan.trims,jumps:compiled.plan.jumps,
      release:compiled.gate.release,checks:compiled.gate.checks
     };
    }
   }
   const state={patternId:p.id,lineageId:p.lineageId,svg:p.svg,objectives:p.objectives,finalCritique:p.finalCritique,raster,feedbackPass,mode,concepts,corpusSignals,visualCorpusCount,corpusObjectCount,productionObjects:p.productionObjects,stitchObjects:p.stitchObjects,surfaceMath:p.surfaceMath,machineProfileId:p.machineProfileId,physicalSizeMm:p.physicalSizeMm,octave:p.octave,productionCompile};
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
 const approvedCanon=await loadApprovedCanon();
 installCorpusCanon(approvedCanon);
 process.stdout.write(JSON.stringify({stage:"canon-bootstrap",approved:approvedCanon.length,mode:"persisted-canon"})+"\n");
 // Keep polling: new runs are queued automatically (daily designs workflow) and must be picked up without a
 // redeploy. A failed claim (e.g. Neon waking up) waits and tries again instead of ending the worker.
 const poll=Number(process.env.WORKER_POLL_MS??30000);
 let done=0,idleLogged=false;
 for(;;){
  let run:any=null;
  try{run=await claim()}catch(e){process.stdout.write(JSON.stringify({level:"warn",event:"claim_failed",message:String((e as Error).message).slice(0,160)})+"\n")}
  if(!run){
   if(process.env.WORKER_ONCE==="1"){await new Promise<void>(r=>server.close(()=>r()));await pool.end();return}
   if(!idleLogged){process.stdout.write(JSON.stringify({status:"idle",candidatesPersisted:done,pollMs:poll})+"\n");idleLogged=true}
   await new Promise(r=>setTimeout(r,poll));continue
  }
  idleLogged=false;
  try{const n=await execute(run);done+=n;process.stdout.write(JSON.stringify({runId:run.id,candidates:n,status:"completed"})+"\n")}
  catch(e){
   process.stdout.write(JSON.stringify({level:"error",runId:run.id,event:"run_failed",message:String((e as Error).message).slice(0,200)})+"\n");
   await pool.query("update synthesis_run set status='failed' where id=$1",[run.id]).catch(()=>{});
   if(process.env.WORKER_ONCE==="1"){await new Promise<void>(r=>server.close(()=>r()));await pool.end();throw e}
  }
  if(process.env.WORKER_ONCE==="1"){await new Promise<void>(r=>server.close(()=>r()));await pool.end();return}
 }
}
main().catch(async e=>{console.error(e);await pool.end();process.exitCode=1});
