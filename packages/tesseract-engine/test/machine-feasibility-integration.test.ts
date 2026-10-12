import {describe,it,expect} from "vitest";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";
import {MACHINE_TEMPLATES} from "../src/machine-template";
import type {StitchIrObject} from "../src/production-stitch-ir";

const brother=MACHINE_TEMPLATES["brother-pr1055x-reference"]!;
const run=(id:string,color="#111111"):StitchIrObject=>({
 kind:"run",id,color,path:[{x:1,y:1},{x:2,y:2}]
});

describe("machine-aware embroidery planning (reference limits only)",()=>{
 it("rejects an oversized single-field sleeve without claiming segmentation is solved",()=>{
  const job=planEmbroideryJob([run("a")],{widthMm:360,heightMm:500,machine:brother});
  expect(job.validation.valid).toBe(false);
  expect(job.validation.errors).toContain("machine-field-exceeded:segmentation-required");
  expect(job.validation.productionApproved).toBe(false);
 });
 it("does not silently rotate a field to make it fit",()=>{
  const job=planEmbroideryJob([run("a")],{widthMm:200,heightMm:300,machine:brother});
  expect(job.validation.errors).toContain("machine-field-exceeded:segmentation-required");
 });
 it("allows a feasible reference field but never grants production approval",()=>{
  const job=planEmbroideryJob([run("a")],{widthMm:100,heightMm:100,machine:brother});
  expect(job.validation.valid).toBe(true);
  expect(job.validation.productionApproved).toBe(false);
  expect(job.validation.warnings.join(" ")).toMatch(/reference-published/);
 });
 it("rejects colors exceeding the selected needle capacity",()=>{
  const colors=Array.from({length:11},(_,i)=>run(String(i),"#"+i.toString(16).padStart(6,"0")));
  const job=planEmbroideryJob(colors,{widthMm:100,heightMm:100,machine:brother});
  expect(job.validation.errors).toContain("machine-color-capacity-exceeded");
 });
 it("fails closed on invalid machine field, missing formats and registration",()=>{
  const machine={...brother,fieldX:{...brother.fieldX,value:0},acceptedFormats:[],registrationToleranceMm:0};
  const job=planEmbroideryJob([run("a")],{widthMm:100,heightMm:100,machine});
  expect(job.validation.errors).toContain("machine-field-unverified");
  expect(job.validation.errors).toContain("machine-format-unverified");
  expect(job.validation.errors).toContain("machine-registration-unverified");
 });
 it("rejects empty embroidery jobs and non-finite path coordinates",()=>{
  expect(planEmbroideryJob([],{widthMm:100,heightMm:100}).validation.errors).toContain("empty-embroidery-job");
  const broken:StitchIrObject={kind:"run",id:"bad",color:"#111111",path:[{x:Infinity,y:1},{x:2,y:2}]};
  expect(planEmbroideryJob([broken],{widthMm:100,heightMm:100}).validation.errors).toContain("invalid-path:bad");
 });
 it("preserves legacy callers and weaving readiness semantics",()=>{
  const job=planEmbroideryJob([run("a")],{widthMm:100,heightMm:100});
  expect(job.validation.valid).toBe(true);
  expect(job.validation.productionApproved).toBe(false);
  expect(job.validation.warnings.join(" ")).toMatch(/No machine selected/);
 });
});
