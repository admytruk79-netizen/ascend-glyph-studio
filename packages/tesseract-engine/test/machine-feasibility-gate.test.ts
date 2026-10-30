import {describe,it,expect} from "vitest";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";
import {generatePatterns} from "../src/pattern-generator";
import {MACHINE_TEMPLATES} from "../src/machine-template";
import type {StitchIrObject} from "../src/production-stitch-ir";

const brother=MACHINE_TEMPLATES["brother-pr1055x-reference"]!;
const run=(id:string,color="#111111"):StitchIrObject=>({
 kind:"run",id,color,path:[{x:1,y:1},{x:2,y:2}]
});
const job=(machine=brother,widthMm=100,heightMm=100,objects:StitchIrObject[]=[run("a")])=>
 planEmbroideryJob(objects,{widthMm,heightMm,machine});

describe("selected-machine feasibility gate (reference-only)",()=>{
 it("rejects oversized single-hoop jobs instead of assuming segmentation",()=>{
  const result=job(brother,360,500);
  expect(result.validation.valid).toBe(false);
  expect(result.validation.errors).toContain("machine-field-exceeded:segmentation-required");
 });
 it("permits rotated field fit but never asserts production approval",()=>{
  const result=job(brother,190,340);
  expect(result.validation.valid).toBe(true);
  expect(result.validation.warnings.join(" ")).toMatch(/not production approval/);
 });
 it("rejects too many distinct thread colors",()=>{
  const objects=Array.from({length:11},(_,i)=>run(String(i),`#${i.toString(16).padStart(6,"0")}`));
  expect(job(brother,100,100,objects).validation.errors).toContain("machine-color-capacity-exceeded");
 });
 it("fails closed for missing fields, frames, formats, needles and registration",()=>{
  const invalid={...brother,fieldX:{...brother.fieldX,value:0},frames:[],
   acceptedFormats:[],needlesPerHead:0,registrationToleranceMm:0};
  const result=job(invalid);
  expect(result.validation.errors).toEqual(expect.arrayContaining([
   "machine-field-unverified","machine-frame-unverified","machine-format-unverified",
   "machine-needle-capacity-unverified","machine-registration-unverified"
  ]));
 });
 it("retains the geometry-only legacy path without claiming machine validation",()=>{
  const result=planEmbroideryJob([run("a")],{widthMm:100,heightMm:100});
  expect(result.validation.valid).toBe(true);
  expect(result.validation.warnings.join(" ")).toMatch(/Reference plan only/);
 });
 it("rejects unknown selected machine IDs rather than ignoring the request",()=>{
  expect(()=>generatePatterns({seed:"unknown-machine",concepts:["ascent"],
   machineProfileId:"not-a-machine"})).toThrow(/unknown-machine-profile/);
 });
 it("passes the selected machine into generated pattern job plans",()=>{
  const patterns=generatePatterns({seed:"machine-gate-regression",concepts:["ascent","ancestry"],
   mode:"emblem",complexity:.2,population:8,generations:1,variations:4,
   machineProfileId:brother.id});
  expect(patterns.length).toBeGreaterThan(0);
  for(const pattern of patterns){
   expect(pattern.machineProfileId).toBe(brother.id);
   expect(pattern.manufacturingJob?.validation.warnings.join(" ")).toContain(brother.id);
  }
 });
});
