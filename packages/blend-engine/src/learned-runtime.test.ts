import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateLearnedComposition} from './learned-runtime.ts';
import {inspectLearnedMotifAssembly} from '../../tesseract-engine/src/learned-motif-runtime.ts';
import type {LearnedMotifSnapshot} from '../../tesseract-engine/src/learned-motif-runtime.ts';
import {MACHINE_TEMPLATES} from '../../tesseract-engine/src/machine-template.ts';
import {ASCEND_PRIMITIVES} from '../../tesseract-engine/src/ascend-primitives.ts';
const snapshot:LearnedMotifSnapshot=JSON.parse(readFileSync('../../data/research/learned-grammar/ukrainian-neon-snapshot-v1.json','utf8'));
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
test('stored grammar reaches the actual composer, stitch planner and Tesseract machine gate',()=>{
 const before=structuredClone(ASCEND_PRIMITIVES),r=generateLearnedComposition(snapshot,input,MACHINE_TEMPLATES['brother-pr1055x-reference']);
 assert.equal(r.learnedModelApplied,true);assert.equal(r.modelTrainingPerformed,false);assert.equal(r.modelApplied.grammarImages,1919);
 assert.equal(r.stitchCount,r.stitchPlan.commands.filter(c=>c.cmd==='stitch').length);assert.ok(r.stitchCount>1000);
 assert.equal(r.structure.brokenJunctions,0);assert.ok(r.assemblies.some(a=>a.role==='hero'));assert.equal(r.assemblies.flatMap(a=>a.objectIds).length,r.objects.length);assert.equal(r.structure.junctionCount,r.assemblyPlan.units*2);
 assert.equal(r.job.validation.valid,true);assert.ok(r.gate.checks.find(c=>c.id==='min-gap')!.pass);
 assert.equal(r.productionApproved,false);assert.equal(r.gate.release,false);assert.ok(r.blockers.includes('recipe-validated'));
 assert.deepEqual(ASCEND_PRIMITIVES,before);assert.doesNotMatch(r.svg,/<image|data:image/);
 assert.throws(()=>inspectLearnedMotifAssembly(snapshot,r.objects,[{fromId:r.objects[0]!.id,fromPoint:{x:0,y:0},toId:r.objects[1]!.id,toPoint:{x:0,y:0}}],{widthMm:250,heightMm:80,seed:'bad-contact'},r.graph.provenance[0]!),/port-off-path/);
 assert.equal(r.graph.provenance[0]!.originalSha256,createHash('sha256').update(readFileSync('src/folk-rich.ts')).digest('hex'));
 const fractional=generateLearnedComposition(snapshot,{...input,widthMm:81});assert.equal(fractional.job.validation.valid,true);
 const oversized=generateLearnedComposition(snapshot,{...input,widthMm:600},MACHINE_TEMPLATES['brother-pr1055x-reference']);
 assert.ok(oversized.blockers.includes('machine-field-exceeded:segmentation-required'));assert.equal(oversized.productionApproved,false);
});
test('the learned neighbour counts change selected motifs, with deterministic regeneration',()=>{
 const options={...input,complexity:0,motif:'horns' as const};
 const a=generateLearnedComposition(snapshot,options),again=generateLearnedComposition(snapshot,options);
 assert.equal(a.svg,again.svg);assert.equal(a.stitchSvg,again.stitchSvg);assert.equal(a.stitchCount,again.stitchCount);
 const changed=structuredClone(snapshot);
 for(const [key,pair] of Object.entries(changed.grammar.pairs))if(key.startsWith('horns|'))pair.n=0;
 changed.grammar.pairs['horns|lily']={n:100000,dx:0,dy:0,ratio:.5};
 const b=generateLearnedComposition(changed,options);assert.deepEqual(b.assemblyPlan.companions,['lily']);assert.notEqual(b.svg,a.svg);
});
test('preserves failed checks and rejects invalid snapshots or unsupported motif choices',()=>{
 const bad=structuredClone(snapshot);bad.grammar.bricks['tree']!.share=NaN;
 assert.throws(()=>generateLearnedComposition(bad,input),/invalid-snapshot/);
 assert.throws(()=>generateLearnedComposition(snapshot,{...input,motif:'leaf'}),/unknown-hero/);
 assert.throws(()=>generateLearnedComposition(snapshot,{...input,widthMm:0}),/input/);
 for(const motif of ['tree','rose','medallion'] as const){const r=generateLearnedComposition(snapshot,{...input,motif});
  assert.equal(r.job.validation.valid,true);assert.equal(r.structure.brokenJunctions,0);
  assert.equal(r.gate.release,false);assert.ok(r.blockers.includes('machine-not-selected'));assert.ok(r.blockers.includes('model-source-rights-review-pending'));
 }
});
