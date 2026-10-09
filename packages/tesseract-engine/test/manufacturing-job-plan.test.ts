import {describe,it,expect} from "vitest";
import {planEmbroideryJob,planWeavingJob} from "../src/manufacturing-job-plan";
import type {StitchIrObject} from "../src/production-stitch-ir";
const sample:StitchIrObject[]=[
 {kind:"run",id:"a",color:"#000000",path:[{x:1,y:1},{x:3,y:3}]},
 {kind:"run",id:"b",color:"#ffffff",path:[{x:15,y:15},{x:18,y:18}]}
];
describe("shared manufacturing job plan",()=>{
 it("keeps all source objects and declares actual travel, trim and color operations",()=>{
  const job=planEmbroideryJob(sample,{widthMm:20,heightMm:20,trimJumpMm:7});
  expect(job.validation.valid).toBe(true);
  expect(job.sourceObjectIds).toEqual(["a","b"]);
  expect(job.operations.filter(o=>o.kind==="stitch")).toHaveLength(2);
  expect(job.operations.some(o=>o.kind==="trim")).toBe(true);
  expect(job.operations.some(o=>o.kind==="color-change")).toBe(true);
  expect(job.metrics.longJumps).toBe(1);
 });
 it("fails closed if toolpath lies outside work envelope",()=>{
  const job=planEmbroideryJob(sample,{widthMm:10,heightMm:10});
  expect(job.validation.valid).toBe(false);
  expect(job.validation.errors).toContain("outside-job-envelope:b");
 });
 it("compiles a historical weave draft with exact drawdown and pick instructions",()=>{
  const job=planWeavingJob([],{widthMm:20,heightMm:20,endsPerCm:5,picksPerCm:5,maxShafts:4,maxTreadles:4});
  expect(job.validation.valid).toBe(true);
  expect(job.loom?.shaftDraft.drawdown).toEqual(job.loom?.liftPlan.liftRows);
  expect(job.operations.filter(o=>o.kind==="loom-pick")).toHaveLength(10);
 });
 it("reports historical machine capacity limits rather than silently approving them",()=>{
  const job=planWeavingJob([],{widthMm:20,heightMm:20,endsPerCm:5,picksPerCm:5,maxShafts:1,maxTreadles:1});
  expect(job.validation.valid).toBe(false);
  expect(job.validation.errors).toContain("shaft-limit-exceeded");
 });
});
