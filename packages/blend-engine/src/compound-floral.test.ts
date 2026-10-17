import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateCompoundFloral} from './compound-floral.ts';
import {MACHINE_TEMPLATES} from '../../tesseract-engine/src/machine-template.ts';
import {ASCEND_PRIMITIVES} from '../../tesseract-engine/src/ascend-primitives.ts';
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
test('original compound flowers retain explicit branches, separated foliage and calculated prototype stitches',()=>{
 const canonical=structuredClone(ASCEND_PRIMITIVES),r=generateCompoundFloral(input,MACHINE_TEMPLATES['brother-pr1055x-reference']);
 assert.ok(r.assemblies.filter(a=>a.role==='compound-flower').length>=9);
 assert.equal(r.structure.brokenJunctions,0);assert.ok(r.structure.junctionCount>20);assert.ok(r.structure.nestedRelations>=9);assert.ok(r.minLeafFlowerClearanceMm>0);
 assert.deepEqual(r.leafFlowerOverlaps,[]);assert.equal(r.job.validation.valid,true);
 assert.equal(r.assemblies.flatMap(a=>a.objectIds).length,r.objects.length);
 assert.equal(r.stitchCount,r.stitchPlan.commands.filter(c=>c.cmd==='stitch').length);assert.ok(r.stitchCount>1000);
 assert.equal(r.productionApproved,false);assert.equal(r.learnedModelApplied,false);assert.equal(r.modelTrainingPerformed,false);
 assert.equal(r.gate.release,false);assert.deepEqual(r.blockers,['recipe-validated']);assert.ok(r.stitchPlan.colors.length<50);assert.deepEqual(ASCEND_PRIMITIVES,canonical);
 assert.doesNotMatch(r.svg,/<image|data:image/);assert.match(r.svg,/compound-floral-reference/);
 assert.equal(r.svg,generateCompoundFloral(input).svg);assert.notEqual(r.svg,generateCompoundFloral({...input,seed:1}).svg);assert.notEqual(r.svg,generateCompoundFloral({...input,seed:3}).svg);
});
test('wide and tall reference jobs preserve the envelope and fail closed on oversized hardware',()=>{
 for(const [widthMm,heightMm] of [[80,40],[80,160],[600,40],[250,160]]){
  const r=generateCompoundFloral({...input,widthMm:widthMm!,heightMm:heightMm!});
  assert.equal(r.job.validation.valid,true,`${widthMm}x${heightMm}: ${r.job.validation.errors}`);assert.equal(r.structure.brokenJunctions,0);assert.deepEqual(r.leafFlowerOverlaps,[]);
 }
 const r=generateCompoundFloral({...input,widthMm:600},MACHINE_TEMPLATES['brother-pr1055x-reference']);assert.ok(r.blockers.includes('machine-field-exceeded:segmentation-required'));assert.equal(r.productionApproved,false);
 for(const change of [{seed:-1},{widthMm:NaN},{heightMm:39},{complexity:2}])assert.throws(()=>generateCompoundFloral({...input,...change}),/invalid-input/);
});
