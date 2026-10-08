import pg from "pg";
const {Pool}=pg;

const BASELINE={
  runId:"26617378-4a2b-4d64-9fa1-3783609b6dc6",
  minSurvivors:11,
  total:12,
  minRasterQuality:.82,
  maxClutter:.10,
  maxTangles:0,
  maxRepeatFailures:0,
  maxFocalFailures:0,
  maxFlatFailures:0
};

const candidateRun=process.argv[2];
if(!candidateRun)throw new Error("usage: tsx scripts/assert-tesseract-regression.mts <candidate-run-id>");
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});

async function metrics(runId:string){
 const q=await pool.query(`
  select
   count(*)::int total,
   count(*) filter(where disposition='candidate')::int survivors,
   coalesce(avg((state->'raster'->>'quality')::numeric),0)::float8 quality,
   coalesce(avg((state->'raster'->>'clutter')::numeric),0)::float8 clutter,
   count(*) filter(where (state->'raster'->'flags') ? 'raster-tangle')::int tangles,
   count(*) filter(where (state->'finalCritique'->'flags') ? 'excessive-path-repetition')::int repeats,
   count(*) filter(where (state->'finalCritique'->'flags') ? 'weak-focal-hierarchy')::int focal,
   count(*) filter(where (state->'finalCritique'->'flags') ? 'flat-composition')::int flat
  from synthesis_candidate where run_id=$1`,[runId]);
 return q.rows[0];
}

const m=await metrics(candidateRun);
const failures:string[]=[];
if(m.total!==BASELINE.total)failures.push(`candidate count ${m.total} != ${BASELINE.total}`);
if(m.survivors<BASELINE.minSurvivors)failures.push(`survivors ${m.survivors} < ${BASELINE.minSurvivors}`);
if(m.quality<BASELINE.minRasterQuality)failures.push(`quality ${m.quality.toFixed(3)} < ${BASELINE.minRasterQuality}`);
if(m.clutter>BASELINE.maxClutter)failures.push(`clutter ${m.clutter.toFixed(3)} > ${BASELINE.maxClutter}`);
if(m.tangles>BASELINE.maxTangles)failures.push(`tangles ${m.tangles} > 0`);
if(m.repeats>BASELINE.maxRepeatFailures)failures.push(`repeat failures ${m.repeats} > 0`);
if(m.focal>BASELINE.maxFocalFailures)failures.push(`focal failures ${m.focal} > 0`);
if(m.flat>BASELINE.maxFlatFailures)failures.push(`flat failures ${m.flat} > 0`);

console.log(JSON.stringify({baseline:BASELINE,candidateRun,metrics:m,pass:failures.length===0,failures},null,2));
await pool.end();
if(failures.length)process.exit(1);
