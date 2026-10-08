import pg from "pg";
const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
const sha=(process.env.GITHUB_SHA??"staging").slice(0,12);
const q=await pool.query(`
 insert into synthesis_run(id,seed,ontology_version_id,solver_version,intent,status)
 values(
  gen_random_uuid(),
  $1,
  'ascend-heritage-0.1',
  $2,
  $3::jsonb,
  'staging-created'
 )
 returning id
`,[
 `ascend-staging-production-${sha}`,
 `staging-production-${sha}`,
 JSON.stringify({
  concepts:[{id:"ancestry",weight:1},{id:"protection",weight:.92},{id:"ascent",weight:.88}],
  mode:"sleeve",complexity:.86,materialId:"embroidery",zoneId:"sleeve",
  machineProfileId:"tajima-tmbp2-sc-reference",
  physicalWidthMm:360,physicalHeightMm:500,
  constructionIntent:{targetOccupancy:.42,seamPolicy:"continuous",maxColors:8,hierarchyDepth:3}
 })
]);
process.stdout.write(String(q.rows[0].id));
await pool.end();
