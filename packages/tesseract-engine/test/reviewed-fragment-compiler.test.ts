import {describe,it,expect} from "vitest";
import {compileReviewedFragmentEvidence,type ReviewedFragmentRecord} from "../src/reviewed-fragment-compiler";
import type {ReferenceEvidence} from "../src/reference-structural-rules";
const record=(id:string,traditionId="ukrainian-ornament",split:ReviewedFragmentRecord["split"]="train",rightsStatus:ReferenceEvidence["rightsStatus"]="approved",culturalReview:ReferenceEvidence["culturalReview"]="approved"):ReviewedFragmentRecord=>({
 traditionId,split,reference:{
  objectId:id,institution:"museum-"+id,objectUrl:"https://example.org/"+id,
  imageSha256:id.padEnd(64,"a").slice(0,64),rightsStatus,culturalReview,
  objectFamilyId:"family-"+id,structuralFeaturesVersion:"ascend.image-structure.v1",
  operations:["repeat","alternate"]
 }
});
describe("reviewed fragment evidence compiler",()=>{
 it("requires two independent, approved training objects within one tradition",()=>{
  const out=compileReviewedFragmentEvidence([record("1"),record("2")]);
  expect(out.counts).toMatchObject({input:2,train:2,approvedRules:2,fragments:2});
  expect(out.libraries["ukrainian-ornament"]?.fragments[0]?.source.sourceIds).toEqual(["1","2"]);
 });
 it("never learns from validation, holdout, unreviewed, or unknown-tradition records",()=>{
  const out=compileReviewedFragmentEvidence([record("1"),record("2","ukrainian-ornament","validation"),record("3","ukrainian-ornament","holdout"),record("4","ukrainian-ornament","train","research-only"),record("5","global")]);
  expect(out.counts).toMatchObject({input:5,train:1,heldOut:2,approvedRules:0,fragments:0});
  expect(out.excluded.map(x=>x.reason)).toContain("independent-rights-and-cultural-review-required");
  expect(out.excluded.map(x=>x.reason)).toContain("missing-specific-tradition");
 });
 it("cannot merge unrelated traditions to manufacture two-object support",()=>{
  const out=compileReviewedFragmentEvidence([record("1","ukrainian-ornament"),record("2","other-tradition")]);
  expect(out.counts.fragments).toBe(0);
 });
 it("rejects repeated source families and malformed provenance",()=>{
  const a=record("1"),b=record("2");b.reference.objectFamilyId=a.reference.objectFamilyId;b.reference.institution=a.reference.institution;
  const out=compileReviewedFragmentEvidence([a,b]);
  expect(out.counts.fragments).toBe(0);
  expect(out.excluded.some(x=>x.reason==="duplicate-image-or-object-family")).toBe(true);
 });
});
