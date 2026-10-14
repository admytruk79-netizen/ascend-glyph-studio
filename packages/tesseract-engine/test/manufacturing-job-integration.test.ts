import {describe,it,expect} from "vitest";
import {generatePatterns} from "../src/pattern-generator";
describe("manufacturing job integration",()=>{
 it("attaches an embroidery operation plan using the exact stitch object IDs",()=>{
  const patterns=generatePatterns({seed:"manufacturing-job-integration",concepts:["ancestry","protection","ascent"],mode:"sleeve",complexity:.2,population:8,generations:1,variations:4});
  expect(patterns.length).toBeGreaterThan(0);
  for(const p of patterns){
   const job=p.manufacturingJob;
   expect(job?.process).toBe("embroidery");
   expect(job?.schema).toBe("ascend.manufacturing.job.v1");
   expect(job?.sourceObjectIds).toEqual(p.stitchObjects?.map(o=>o.id));
   expect(job?.operations.filter(o=>o.kind==="stitch").length).toBe(p.stitchObjects?.length);
   expect(job?.metrics.operationCount).toBe(job?.operations.length);
  }
 });
});

describe('selected-machine job integration',()=>{
 it('passes the reference machine into sleeve job feasibility without approving segmentation',()=>{
  const patterns=generatePatterns({seed:'machine-sleeve-handoff',concepts:['ancestry','protection','ascent'],mode:'sleeve',complexity:.2,population:8,generations:1,variations:4,machineProfileId:'brother-pr1055x-reference',physicalWidthMm:360,physicalHeightMm:500});
  expect(patterns.length).toBeGreaterThan(0);
  for(const p of patterns){
   expect(p.machineProfileId).toBe('brother-pr1055x-reference');
   expect(p.manufacturingJob?.validation.valid).toBe(false);
   expect(p.manufacturingJob?.validation.errors).toContain('machine-field-exceeded:segmentation-required');
   expect(p.manufacturingJob?.validation.warnings.join(' ')).toContain('Reference plan only');
  }
 });
 it('rejects an unknown requested profile instead of reverting to unchecked generation',()=>{
  expect(()=>generatePatterns({seed:'unknown-machine',concepts:[],machineProfileId:'missing-profile'})).toThrow('unknown-machine-profile');
 });
});
