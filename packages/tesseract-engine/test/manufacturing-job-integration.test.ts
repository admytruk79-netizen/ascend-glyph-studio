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
