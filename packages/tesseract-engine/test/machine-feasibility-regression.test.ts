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

describe('machine feasibility compatibility and invalid reference metadata',()=>{
 it.each([NaN,Infinity,-1,0])('rejects non-finite/non-positive field %s',value=>{
  const j=planEmbroideryJob([run('a','#000')],{widthMm:100,heightMm:100,machine:{...brother,fieldY:{...brother.fieldY,value}}});
  expect(j.validation.errors).toContain('machine-field-unverified');expect(j.validation.valid).toBe(false);
 });
 it.each([NaN,Infinity,0,-1,1.5])('rejects invalid color capacity %s',maxColors=>{
  const j=planEmbroideryJob([run('a','#000')],{widthMm:100,heightMm:100,machine:{...brother,maxColors}});
  expect(j.validation.errors).toContain('machine-color-capacity-unverified');expect(j.validation.valid).toBe(false);
 });
 it('rejects missing accepted formats',()=>{
  const j=planEmbroideryJob([run('a','#000')],{widthMm:100,heightMm:100,machine:{...brother,acceptedFormats:[]}});
  expect(j.validation.errors).toContain('machine-format-unverified');expect(j.validation.valid).toBe(false);
 });
 it('rejects malformed runtime units and unsupported format declarations',()=>{
  const machine=structuredClone(brother);
  Object.assign(machine.fieldX,{unit:'in'});
  Object.assign(machine,{acceptedFormats:['SVG']});
  const j=planEmbroideryJob([run('a','#000')],{widthMm:100,heightMm:100,machine});
  expect(j.validation.errors).toContain('machine-field-unverified');
  expect(j.validation.errors).toContain('machine-format-unverified');
  expect(j.validation.valid).toBe(false);
 });
 it('fits at exact field boundaries in either orientation without mutating the profile',()=>{
  const snapshot=JSON.stringify(brother);
  for(const [widthMm,heightMm] of [[356,203],[203,356]]){
   expect(planEmbroideryJob([run('a','#000')],{widthMm,heightMm,machine:brother}).validation.valid).toBe(true);
  }
  expect(JSON.stringify(brother)).toBe(snapshot);expect(brother.confidence).toBe('reference-published');
 });
 it('rejects field overflow rather than silently planning multi-hoop registration',()=>{
  const j=planEmbroideryJob([run('a','#000')],{widthMm:356.001,heightMm:203,machine:brother});
  expect(j.validation.errors).toContain('machine-field-exceeded:segmentation-required');
 });
 it('preserves callers without a selected machine and existing geometry failures',()=>{
  expect(planEmbroideryJob([run('a','#000')],{widthMm:360,heightMm:500}).validation.valid).toBe(true);
  const j=planEmbroideryJob([run('a','#000')],{widthMm:0,heightMm:100,machine:brother});
  expect(j.validation.errors).toContain('invalid-job-size');expect(j.validation.valid).toBe(false);
 });
});
