import pg from "pg";
const {Pool}=pg;

// Read-only diagnostic. Reports per-candidate raster clutter and final-critic
// metadata; never changes the fixed 3.7 acceptance threshold.
const runId=process.argv[2];
if(!runId)throw new Error("usage: tsx scripts/diagnose-staging-clutter.mts <run-id>");
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
try{
 const result=await pool.query(`
  select
   coalesce(state->>'id', 'candidate-' || row_number() over(order by (state->'raster'->>'clutter')::numeric desc)::text) as candidate_id,
   (state->'raster'->>'clutter')::float8 as clutter,
   (state->'raster'->>'quality')::float8 as quality,
   state->'finalCritique'->'flags' as final_flags,
   state->'raster'->'flags' as raster_flags,
   state->>'mode' as mode
  from synthesis_candidate
  where run_id=$1
  order by clutter desc nulls last`,[runId]);
 const rows=result.rows;
 const measured=rows.filter(r=>Number.isFinite(r.clutter));
 const average=measured.length?measured.reduce((s,r)=>s+r.clutter,0)/measured.length:null;
 console.log(JSON.stringify({runId,count:rows.length,measured:measured.length,averageClutter:average,
  baselineMaxClutter:0.10,excess:average===null?null:Math.max(0,average-.10),
  aboveLimit:measured.filter(r=>r.clutter>.10).length,candidates:rows},null,2));
 if(measured.length!==rows.length||!rows.length)process.exitCode=1;
}finally{await pool.end();}
