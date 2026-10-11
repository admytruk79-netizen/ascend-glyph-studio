import {describe,it,expect} from "vitest";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";
import {MACHINE_TEMPLATES} from "../src/machine-template";
import type {StitchIrObject} from "../src/production-stitch-ir";
const run=(id:string,color:string):StitchIrObject=>({kind:"run",id,color,path:[{x:1,y:1},{x:2,y:2}]});
const brother=MACHINE_TEMPLATES["brother-pr1055x-reference"]!;
describe("reference machine feasibility (never production approval)",()=>{
 it("rejects an oversized single-hoop sleeve",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:360,heightMm:500,machine:brother});
  expect(j.validation.errors).toContain("machine-field-exceeded:segmentation-required");
  expect(j.validation.valid).toBe(false);
 });
 it("accepts field geometry without granting physical approval",()=>{
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:100,machine:brother});
  expect(j.validation.valid).toBe(true);
  expect(j.validation.warnings.join(" ")).toMatch(/Reference plan only/);
 });
 it("rejects color count beyond template capacity",()=>{
  const objects=Array.from({length:11},(_,i)=>run(String(i),`#${i.toString(16).padStart(6,"0")}`));
  const j=planEmbroideryJob(objects,{widthMm:100,heightMm:100,machine:brother});
  expect(j.validation.errors).toContain("machine-color-capacity-exceeded");
 });
 it("fails closed on an unusable machine field",()=>{
  const invalid={...brother,fieldX:{...brother.fieldX,value:0}};
  const j=planEmbroideryJob([run("a","#000")],{widthMm:100,heightMm:100,machine:invalid});
  expect(j.validation.errors).toContain("machine-field-unverified");
 });
});
