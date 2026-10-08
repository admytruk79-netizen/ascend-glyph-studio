import pg from "pg";
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});

const runs=(process.argv.slice(2).filter(x=>!x.startsWith("--")));
if(!runs.length)throw new Error("usage: tsx scripts/benchmark-tesseract.mts <run-id> [run-id...]");

function num(v:any){const n=Number(v);return Number.isFinite(n)?n:0}
for(const runId of runs){
 const q=await pool.query(`
  select ordinal,score,disposition,state
  from synthesis_candidate where run_id=$1 order by ordinal`,[runId]);
 const rows=q.rows;
 const total=rows.length||1;
 const flagCount=(flag:string)=>rows.filter(r=>[
   ...(r.state?.raster?.flags??[]),...(r.state?.finalCritique?.flags??[])
 ].includes(flag)).length;
 const lineages=new Set(rows.map(r=>r.state?.lineageId).filter(Boolean));
 const metrics={
  runId,
  candidates:rows.length,
  survivalRate:rows.filter(r=>r.disposition==="candidate").length/total,
  avgRasterQuality:rows.reduce((s,r)=>s+num(r.state?.raster?.quality),0)/total,
  avgClutter:rows.reduce((s,r)=>s+num(r.state?.raster?.clutter),0)/total,
  avgOriginality:rows.reduce((s,r)=>s+num(r.state?.finalCritique?.originality),0)/total,
  avgGenericRisk:rows.reduce((s,r)=>s+num(r.state?.finalCritique?.genericRisk),0)/total,
  tangleRate:flagCount("raster-tangle")/total,
  repetitionFailureRate:flagCount("excessive-path-repetition")/total,
  weakFocalRate:flagCount("weak-focal-hierarchy")/total,
  flatCompositionRate:flagCount("flat-composition")/total,
  lineageDiversity:lineages.size/total
 };
 console.log(JSON.stringify(metrics));
}
await pool.end();
