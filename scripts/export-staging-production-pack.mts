import pg from "pg";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {compileProductionIr,previewSvg,recipes,runSheet,writeDst,type ProductionStitchIrObject} from "../packages/stitch-engine/src/index";
import {machineTemplate} from "../packages/tesseract-engine/src/machine-template";

const runId=process.argv[2],ordinal=Number(process.argv[3]??0),outDir=process.argv[4]??"out/staging-production-pack";
if(!runId)throw new Error("usage: tsx scripts/export-staging-production-pack.mts <run-id> [ordinal] [out-dir]");
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
const {Pool}=pg;const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
const q=await pool.query(`select r.seed,r.solver_version,c.ordinal,c.state
 from synthesis_candidate c join synthesis_run r on r.id=c.run_id
 where c.run_id=$1 and c.ordinal=$2 limit 1`,[runId,ordinal]);
await pool.end();
const row=q.rows[0];if(!row)throw new Error("candidate not found");
const s=row.state??{},stitchObjects=s.stitchObjects as ProductionStitchIrObject[]|undefined;
if(!Array.isArray(stitchObjects)||!stitchObjects.length)throw new Error("candidate has no persisted stitchObjects");
const machine=machineTemplate(s.machineProfileId);if(!machine)throw new Error("candidate has no known machine profile");
const recipeId=String(s.productionCompile?.recipeId??"linen-180-prewashed"),recipe=recipes[recipeId];
if(!recipe)throw new Error(`unknown recipe ${recipeId}`);
const compiled=compileProductionIr(stitchObjects,recipe,{
 hoop:{name:machine.id,width:machine.fieldX.value,height:machine.fieldY.value},
 maxStitches:machine.maxPracticalStitches,maxMinutes:machine.maxContinuousRunMinutes
});
const base=`tesseract-${runId.slice(0,8)}-c${String(ordinal).padStart(2,"0")}`;
const dir=join(outDir,base);await mkdir(dir,{recursive:true});
const dst=writeDst(compiled.plan.commands,{label:base.slice(0,16)});
await writeFile(join(dir,base+".dst"),dst);
await writeFile(join(dir,base+"-stitches.svg"),previewSvg(compiled.plan.commands,compiled.plan.colors,{showJumps:true,thread:.45}),"utf8");
const sheet=runSheet({
 designId:base,revision:String(row.solver_version),zone:String(s.physicalSizeMm?.zoneId??"sleeve"),
 file:base+".dst",plan:compiled.plan,r:recipe,
 compensation:{scaleX:1,scaleY:1}
});
await writeFile(join(dir,base+"-runsheet.json"),JSON.stringify(sheet,null,2),"utf8");
const manifest={
 schemaVersion:"staging-production-pack-1",
 runId,ordinal,seed:row.seed,solverVersion:row.solver_version,
 prototypeOnly:!compiled.gate.release,
 blockers:compiled.gate.checks.filter(x=>!x.pass),
 machine:{
  id:machine.id,maker:machine.maker,model:machine.model,
  fieldMm:[machine.fieldX.value,machine.fieldY.value],heads:machine.heads,
  needlesPerHead:machine.needlesPerHead,maxColors:machine.maxColors,
  frames:machine.frames,formats:machine.acceptedFormats,registrationToleranceMm:machine.registrationToleranceMm
 },
 recipe:{id:recipe.id,material:recipe.material,validated:recipe.validated},
 production:{
  productionObjects:Array.isArray(s.productionObjects)?s.productionObjects.length:0,
  stitchObjects:stitchObjects.length,
  predictedStitches:compiled.math.predictedStitches,
  compiledStitches:compiled.realized.stitchCount,
  needleThreadM:compiled.math.needleThreadM,bobbinThreadM:compiled.math.bobbinThreadM,
  totalThreadM:compiled.math.totalThreadM,machineMinutes:compiled.minutes,
  colors:compiled.plan.colors,trims:compiled.plan.trims,jumps:compiled.plan.jumps
 },
 octave:s.octave??null,surfaceMath:s.surfaceMath??null,
 files:[base+".dst",base+"-stitches.svg",base+"-runsheet.json",base+"-manifest.json"]
};
await writeFile(join(dir,base+"-manifest.json"),JSON.stringify(manifest,null,2),"utf8");
process.stdout.write(JSON.stringify({dir,base,release:compiled.gate.release,blockers:manifest.blockers,compiledStitches:compiled.realized.stitchCount},null,2)+"\n");
