import pg from "pg";
const {Pool}=pg;
const url=process.env.DATABASE_URL;
const runId=process.argv[2];
if(!url||!runId)throw new Error("usage: DATABASE_URL=... tsx scripts/assert-staging-production-metadata.mts <run-id>");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
const runQ=await pool.query("select intent from synthesis_run where id=$1",[runId]);
if(!runQ.rows[0])throw new Error("staging run not found");
const runIntent=runQ.rows[0].intent??{};
const requestedOccupancy=Number(runIntent?.constructionIntent?.targetOccupancy);
const seamPolicy=runIntent?.constructionIntent?.seamPolicy;
const q=await pool.query(`
 select ordinal,disposition,state
 from synthesis_candidate where run_id=$1 order by ordinal
`,[runId]);
if(!q.rows.length)throw new Error("no staging candidates persisted");
const failures:string[]=[];
for(const r of q.rows){
 const s=r.state??{};
 if(!Array.isArray(s.productionObjects)||s.productionObjects.length===0)failures.push(`${r.ordinal}:missing-production-objects`);
 if(!Array.isArray(s.stitchObjects)||s.stitchObjects.length===0)failures.push(`${r.ordinal}:missing-stitch-ir`);
 if(s.machineProfileId!=="tajima-tmbp2-sc-reference")failures.push(`${r.ordinal}:wrong-machine-profile`);
 if(!(Number(s.physicalSizeMm?.width)>0&&Number(s.physicalSizeMm?.height)>0))failures.push(`${r.ordinal}:missing-physical-size`);
 if(!s.octave||!Number.isFinite(Number(s.octave.nodes)))failures.push(`${r.ordinal}:missing-octave-state`);
 if(!s.surfaceMath||!Number.isFinite(Number(s.surfaceMath.nominalOccupancy)))failures.push(`${r.ordinal}:missing-surface-math`);
 else{
  if(!Number.isFinite(Number(s.surfaceMath.layoutOccupancy)))failures.push(`${r.ordinal}:missing-layout-occupancy`);
  if(Array.isArray(s.surfaceMath.invalidPairs)&&s.surfaceMath.invalidPairs.length)failures.push(`${r.ordinal}:surface-collisions=${s.surfaceMath.invalidPairs.length}`);
  if(seamPolicy==="avoid"&&Array.isArray(s.surfaceMath.seamCrossings)&&s.surfaceMath.seamCrossings.length)failures.push(`${r.ordinal}:seam-crossings=${s.surfaceMath.seamCrossings.join(",")}`);
  if(Number.isFinite(requestedOccupancy)&&Number.isFinite(Number(s.surfaceMath.layoutOccupancy))){
   const delta=Math.abs(Number(s.surfaceMath.layoutOccupancy)-requestedOccupancy);
   if(delta>.12)failures.push(`${r.ordinal}:layout-occupancy=${Number(s.surfaceMath.layoutOccupancy).toFixed(3)} target=${requestedOccupancy.toFixed(3)}`);
  }
 }
 // Source-port junctions are physical stitch IR, never untracked SVG helpers.
 // The persisted lineage must survive worker -> candidate -> production pack.
 const productionObjects=Array.isArray(s.productionObjects)?s.productionObjects:[];
 const stitchObjects=Array.isArray(s.stitchObjects)?s.stitchObjects:[];
 const links=Array.isArray(s.portConnections)?s.portConnections:[];
 const connectorIds=new Set(stitchObjects.filter((o:any)=>
  typeof o?.id==="string"&&o.id.startsWith("connector:")).map((o:any)=>o.id));
 const sourceById=new Map(productionObjects.map((o:any)=>[o.id,o]));
 if(connectorIds.size!==links.length)
  failures.push(`${r.ordinal}:connector-lineage-count-mismatch:${connectorIds.size}:${links.length}`);
 for(const [i,link] of links.entries()){
  const id=`connector:${i}`;
  const ir=stitchObjects.find((o:any)=>o.id===id);
  if(!ir||ir.kind!=="run")failures.push(`${r.ordinal}:missing-run-connector:${id}`);
  if(link?.validationState!=="REFERENCE")
   failures.push(`${r.ordinal}:connector-not-reference:${id}`);
  const from:any=sourceById.get(link?.fromObjectId),to:any=sourceById.get(link?.toObjectId);
  if(!from||!to)failures.push(`${r.ordinal}:connector-missing-source:${id}`);
  else if(from.geometryRef!==link.fromGeometryRef||to.geometryRef!==link.toGeometryRef)
   failures.push(`${r.ordinal}:connector-geometry-provenance-mismatch:${id}`);
 }
 if(runIntent.enableCoverageAwareBranchLeaf===true){
  const branchLeaves=productionObjects.filter((o:any)=>o?.branchLeaf);
  const connected=new Set(links.flatMap((l:any)=>[l.fromObjectId,l.toObjectId]));
  for(const o of branchLeaves){
   if(!connected.has(o.id))failures.push(`${r.ordinal}:orphan-branch-leaf:${o.id}`);
   if(o.branchLeaf.validationState!=="REFERENCE")
    failures.push(`${r.ordinal}:branch-leaf-not-reference:${o.id}`);
  }
 }
 const pc=s.productionCompile;
 if(!pc)failures.push(`${r.ordinal}:missing-production-compile`);
 else{
  if(!(Number(pc.compiledStitches)>0))failures.push(`${r.ordinal}:missing-compiled-stitches`);
  if(!(Number(pc.totalThreadM)>0))failures.push(`${r.ordinal}:missing-thread-estimate`);
  if(!(Number(pc.minutes)>0))failures.push(`${r.ordinal}:missing-machine-time`);
  if(!Array.isArray(pc.checks)||!pc.checks.length)failures.push(`${r.ordinal}:missing-machine-gate`);
  // Reference linen recipe is intentionally unvalidated, so release must remain false.
  if(pc.release!==false)failures.push(`${r.ordinal}:reference-recipe-incorrectly-released`);
 }
}
console.log(JSON.stringify({runId,candidates:q.rows.length,pass:failures.length===0,failures},null,2));
await pool.end();
if(failures.length)process.exit(1);
