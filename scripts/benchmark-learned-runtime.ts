import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {generateLearnedComposition} from '../packages/blend-engine/src/learned-runtime.ts';
import type {LearnedMotifSnapshot} from '../packages/tesseract-engine/src/learned-motif-runtime';
async function main(){
 const path='data/research/learned-grammar/ukrainian-neon-snapshot-v1.json',bytes=readFileSync(path),snapshot:LearnedMotifSnapshot=JSON.parse(bytes.toString()),out='data/research/motif-benchmarks/learned-runtime-v1';mkdirSync(out,{recursive:true});
 const cases=[];
 for(const [id,family,motif,seed] of [['auto-0','floral','auto',0],['tree-1','floral','tree',1],['rose-2','floral','rose',2],['medallion-3','geometric','medallion',3]] as const){
  const r=generateLearnedComposition(snapshot,{widthMm:250,heightMm:80,complexity:.8,family,motif,seed});
  writeFileSync(`${out}/${id}.svg`,r.svg+'\n');writeFileSync(`${out}/${id}-stitches.svg`,r.stitchSvg+'\n');await sharp(Buffer.from(r.svg)).resize({width:1800}).png().toFile(`${out}/${id}.png`);
  writeFileSync(`${out}/${id}.graph.json`,JSON.stringify(r.graph)+'\n');
  cases.push({id,input:r.input,plan:r.assemblyPlan,structure:r.structure,modelApplied:r.modelApplied,objectCount:r.objects.length,stitchCount:r.stitchCount,estimatedMinutes:r.estimatedMinutes,gate:r.gate,blockers:r.blockers,jobValidation:r.job.validation,svgSha256:createHash('sha256').update(r.svg).digest('hex'),productionApproved:false});
 }
 writeFileSync(`${out}/report.json`,JSON.stringify({schema:'ascend.learned-runtime-benchmark.v1',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),modelTrainingPerformed:false,cases},null,2)+'\n');console.log(JSON.stringify(cases.map(r=>({id:r.id,plan:r.plan,stitches:r.stitchCount,blockers:r.blockers}))));
}
main().catch(e=>{console.error(e);process.exitCode=1});
