import {describe,it,expect} from "vitest";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";
import {MACHINE_TEMPLATES} from "../src/machine-template";
import type {StitchIrObject} from "../src/production-stitch-ir";
const run=(id:string,color:string):StitchIrObject=>({kind:"run",id,color,path:[{x:1,y:1},{x:2,y:2}]});
const brother=MACHINE_TEMPLATES["brother-pr1055x-reference"]!;
describe("machine-specific reference feasibility (not production approval)",()=>{
 it("rejects oversized single-hoop work requiring segmentation",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:360,heightMm:500,machine:brother});
  expect(j.validation.valid).toBe(false);
  expect(j.validation.errors).toContain("machine-field-exceeded:segmentation-required");
 });
 it("checks orientation and does not imply physical validation",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:200,machine:brother});
  expect(j.validation.valid).toBe(true);
  expect(j.validation.warnings.join(" ")).toMatch(/reference data/i);
  expect(j.validation.warnings.join(" ")).toMatch(/physical sew-out/i);
 });
 it("rejects a design that would fit only after an unplanned 90-degree rotation",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:190,heightMm:330,machine:brother});
  expect(j.validation.valid).toBe(false);
  expect(j.validation.errors).toContain("machine-field-exceeded:segmentation-required");
 });
 it("rejects excessive colors",()=>{
  const objects=Array.from({length:11},(_,i)=>run(String(i),`#${i.toString(16).padStart(6,"0")}`));
  const j=planEmbroideryJob(objects,{widthMm:100,heightMm:100,machine:brother});
  expect(j.validation.errors).toContain("machine-color-capacity-exceeded");
 });
 it("rejects missing machine fields and formats",()=>{
  const invalid={...brother,fieldX:{...brother.fieldX,value:0},acceptedFormats:[]};
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:100,machine:invalid});
  expect(j.validation.errors).toContain("machine-field-unverified");
  expect(j.validation.errors).toContain("machine-format-unverified");
 });
 it("rejects placeholder templates rather than silently accepting them",()=>{
  const placeholder=MACHINE_TEMPLATES["industrial-multihead-generic"]!;
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:100,machine:placeholder});
  expect(j.validation.valid).toBe(false);
  expect(j.validation.errors).toContain("machine-field-unverified");
  expect(j.validation.errors).toContain("machine-frame-unverified");
 });
 it("preserves backward compatibility for callers without machine",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:100});
  expect(j.validation.valid).toBe(true);
  expect(j.validation.warnings.join(" ")).toMatch(/No machine template selected/);
 });
});
