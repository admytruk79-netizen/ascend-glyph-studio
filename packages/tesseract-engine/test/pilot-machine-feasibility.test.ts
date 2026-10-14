import {describe,it,expect} from 'vitest';
import {runPilotProduction,type PilotRunInput} from '../src/pilot-runner';
import {MACHINE_TEMPLATES} from '../src/machine-template';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
const input: PilotRunInput={seed:'motif-fullshirt-integration-v2',intent:{concepts:[{id:'ancestors',weight:1},{id:'protection',weight:.9}],traditions:[{id:'ascend-core',weight:1}],character:[{id:'ordered-organic',weight:.7}],materialId:'linen-woven',zoneId:'sleeve-wrap'},principles:[],population:8,generations:1,keep:2,medium:'embroidery',machineProfileId:'brother-pr1055x-reference'};
describe('reference full-shirt machine feasibility',()=>{
 it('uses physical zone millimetres and retains per-zone feasibility blockers in the packet',()=>{
  const before=JSON.stringify(ASCEND_PRIMITIVES),result=runPilotProduction(input);
  expect(result.errors).toEqual([]);expect(result.batch.candidateCount).toBe(2);
  expect(result.manifest?.machine?.id).toBe(input.machineProfileId);
  expect(result.manifest?.blockers).toContain('zone-job:sleeve-left:sleeve:0:machine-field-exceeded:segmentation-required');
  expect(result.manifest?.productionApproved).toBe(false);
  const zones=result.batch.candidates[0].zones;
  expect(zones).toHaveLength(15);expect(zones.every(z=>!!z.manufacturingJob)).toBe(true);
  const placket=zones.find(z=>z.zoneId==='front-left:placket:1')!,job=placket.manufacturingJob!;
  expect(job.widthMm).toBe(45);expect(job.heightMm).toBe(787);
  expect(job.sourceObjectIds).toEqual(placket.stitchObjects?.map(o=>o.id));
  expect(job.validation.errors.some(e=>e.startsWith('outside-job-envelope:'))).toBe(false);
  for(const o of placket.stitchObjects??[])for(const p of o.kind==='fill'?o.polygon:o.path){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(45);}
  expect(JSON.stringify(ASCEND_PRIMITIVES)).toBe(before);
 });
 it('rejects contradictory machine profile and manufacturing packet identity',()=>{
  const result=runPilotProduction({...input,machine:MACHINE_TEMPLATES['tajima-tmbp2-sc-reference']});
  expect(result.errors).toContain('machine-profile-mismatch');expect(result.artifacts).toEqual([]);expect(result.manifest).toBeUndefined();
 });
 it('rejects an unknown requested batch profile',()=>{
  expect(()=>runPilotProduction({...input,machineProfileId:'missing-profile'})).toThrow('unknown-machine-profile');
 });
 it('keeps the legacy semantic pilot reference-only when no production medium is requested',()=>{
  const result=runPilotProduction({...input,medium:undefined,machineProfileId:undefined});
  expect(result.errors).toEqual([]);expect(result.batch.candidates[0].zones.every(z=>!z.manufacturingJob)).toBe(true);
  expect(result.manifest?.productionApproved).toBe(false);expect(result.manifest?.blockers).toContain('embroidery-machine-not-selected');
 });
});
