import pg from "pg";
import {deriveCorpusCanon} from "../packages/tesseract-engine/src/corpus-canonical";

const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:2});

function observation(r:any){
 const f=r.features||{},d=r.deconstruction||{},dirs:string[]=[];
 if(f.dominantAxis==="horizontal")dirs.push("horizontal"); else if(f.dominantAxis==="vertical")dirs.push("vertical"); else dirs.push("field");
 if(Number(f.radiality||0)>.48)dirs.push("radial");
 if(r.kind==="frieze"||r.kind==="band")dirs.push("wrap");
 const ops:string[]=[];
 if(Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0))>.45)ops.push("repeat");
 if(Math.abs(Number(f.mirrorX||0)-Number(f.mirrorY||0))>.12||Number(f.densityVariation||0)>.55)ops.push("interrupt");
 if(Number(f.radiality||0)>.5)ops.push("branch");
 const scale=Array.isArray(f.scaleHierarchy)?f.scaleHierarchy.length:1;
 return {
  id:r.id,sourceRef:r.source_url||r.source_key,class:"real-historical" as const,
  evidenceTier:Number(r.reliability||0)>=.85?"A" as const:"B" as const,
  verifiedReal:true,trainingUse:"composition" as const,
  features:{
   symmetry:(Number(f.mirrorX||.5)+Number(f.mirrorY||.5)+Number(f.rotation180||.5))/3,
   density:Number(f.edgeDensity||.5),voidRatio:Number(f.voidRatio||.5),scaleLevels:scale,
   dominantDirection:dirs,operations:ops,densityVariation:Number(f.densityVariation||.5),
   directionalEntropy:Array.isArray(f.orientation)?(()=>{const xs=f.orientation.map((x:any)=>Number(x||0)),sum=xs.reduce((a:number,b:number)=>a+b,0)||1;return -xs.reduce((h:number,x:number)=>{const p=x/sum;return p>0?h+p*Math.log(p):h},0)/Math.log(Math.max(2,xs.length))})():.5,
   axisStrength:Number(f.axisStrength||.5),rotation180:Number(f.rotation180||.5),
   periodicity:Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0)),
   focalDominance:Math.max(0,Math.min(1,(scale>1?.55:.25)+Number(f.densityVariation||0)*.35+(1-Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0)))*.1)),
   asymmetryBalance:Math.max(0,Math.min(1,Math.abs(Number(f.mirrorX||.5)-Number(f.mirrorY||.5))*1.5+Number(f.densityVariation||0)*.35)),
   motifFieldRatio:Number(d?.scale?.motif||.5),
   compositionalDepth:Math.max(0,Math.min(1,(scale/5)*.45+Number(f.densityVariation||0)*.35+Number(f.radiality||0)*.2)),
   embroideryComplexity:Math.max(0,Math.min(1,Number(f.edgeDensity||.5)*.35+Number(f.densityVariation||.5)*.25+(scale/5)*.2+Math.max(Number(f.repetitionX||0),Number(f.repetitionY||0))*.2))
  },
  notes:[r.kind||"unknown",r.tradition||"unknown"],provenance:r.id
 };
}

const q=await pool.query(`
 select a.id,a.source_key,a.source_url,a.tradition,a.kind,a.features,a.deconstruction,o.reliability
 from research_corpus_analysis a join research_corpus_object o on o.id=a.id
 where o.cultural_access in ('open','structure-only')
   and a.features <> '{}'::jsonb
   and coalesce(a.split,'train') <> 'holdout'
`);
const observations=q.rows.map(observation);
const canon=deriveCorpusCanon(observations,{count:24,minTraditions:4,minSources:24,minSupport:32,minReferenceDistance:.02});
await pool.query("begin");
try{
 for(const x of canon){
  await pool.query(`insert into corpus_canonical(id,version,status,support,traditions,sources,centroid,paths,nearest_reference_distance,provenance,built_at)
   values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb,now())
   on conflict(id) do update set version=excluded.version,status=excluded.status,support=excluded.support,traditions=excluded.traditions,
   sources=excluded.sources,centroid=excluded.centroid,paths=excluded.paths,nearest_reference_distance=excluded.nearest_reference_distance,
   provenance=excluded.provenance,built_at=now()`,
   [x.id,x.version,x.status,x.support,JSON.stringify(x.traditions),JSON.stringify(x.sources),JSON.stringify(x.centroid),JSON.stringify(x.paths),x.nearestReferenceDistance,JSON.stringify(x.provenance)]);
 }
 await pool.query("commit");
}catch(e){await pool.query("rollback");throw e}
console.log(JSON.stringify({observations:observations.length,proposals:canon.length,autoEligible:canon.filter(x=>x.status==="canonical").length,review:"human-required"}));
await pool.end();
