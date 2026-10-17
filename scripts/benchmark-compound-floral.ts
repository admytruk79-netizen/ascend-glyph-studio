import {mkdirSync,writeFileSync} from 'node:fs';
import {generateCompoundFloral} from '../packages/blend-engine/src/compound-floral.ts';
import {MACHINE_TEMPLATES} from '../packages/tesseract-engine/src/machine-template.ts';
const out='data/research/motif-benchmarks/compound-floral-v1';mkdirSync(out,{recursive:true});
const cases=[];
for(const seed of [0,1,3]){
 const result=generateCompoundFloral({widthMm:250,heightMm:80,complexity:.8,family:'floral',seed},MACHINE_TEMPLATES['brother-pr1055x-reference']);
 writeFileSync(`${out}/seed-${seed}.svg`,result.svg);
 cases.push({seed,units:result.columns,objectCount:result.objects.length,structure:result.structure,minLeafFlowerClearanceMm:result.minLeafFlowerClearanceMm,stitchCount:result.stitchCount,colorPasses:result.stitchPlan.colors.length,trims:result.stitchPlan.trims,estimatedMinutes:result.estimatedMinutes,job:result.job.validation,gate:result.gate,blockers:result.blockers});
}
writeFileSync(`${out}/report.json`,JSON.stringify({method:'Original procedural compound motifs; existing Kit, MotifGraph, containment, machine gate and stitch planner. Layer order preserved; no image-model training.',productionApproved:false,cases},null,2));
console.log(JSON.stringify(cases.map(({seed,stitchCount,structure,minLeafFlowerClearanceMm,colorPasses,blockers})=>({seed,stitchCount,structure,minLeafFlowerClearanceMm,colorPasses,blockers})),null,2));
