import {describe,it,expect} from "vitest";
import {analyzeReviewedReferences} from "../src/reviewed-image-pipeline";
const frame={width:16,height:16,rgba:new Uint8Array(16*16*4)};
for(let i=0;i<16*16;i++){const v=Math.floor(i/16)%4===0?0:255;frame.rgba[i*4]=v;frame.rgba[i*4+1]=v;frame.rgba[i*4+2]=v;frame.rgba[i*4+3]=255;}
const entry=(id:string,approved=true)=>({reference:{objectId:id,institution:"Institution "+id,objectUrl:"https://example.org/"+id,imageSha256:id.repeat(64),objectFamilyId:id,rightsStatus:approved?"approved" as const:"research-only" as const,culturalReview:"approved" as const},frame,backgroundRgb:[255,255,255] as [number,number,number]});
describe("reviewed image evidence pipeline",()=>{
 it("converts image structure into supported rules with lineage",()=>{
  const result=analyzeReviewedReferences([entry("a"),entry("b")]);
  expect(result.errors).toEqual([]);
  expect(result.analyzed).toHaveLength(2);
  expect(result.extraction.rules.some(x=>x.operation==="alternate")).toBe(true);
  expect(result.extraction.rules.find(x=>x.operation==="alternate")?.supportingObjectIds).toEqual(["a","b"]);
 });
 it("does not analyze references without approved rights",()=>{
  const result=analyzeReviewedReferences([entry("a",false)]);
  expect(result.analyzed).toHaveLength(0);
  expect(result.extraction.rules).toEqual([]);
  expect(result.errors[0]?.reason).toBe("rights-or-cultural-review-not-approved");
 });
});
