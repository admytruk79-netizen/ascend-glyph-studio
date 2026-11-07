import {describe,it,expect} from "vitest";
import {extractStructuralRules,buildCandidateLineage,type ReferenceEvidence} from "../src/reference-structural-rules";
const item=(id:string,patch:Partial<ReferenceEvidence>={}):ReferenceEvidence=>({
 objectId:id,institution:"Museum "+id,objectUrl:"https://example.org/"+id,imageSha256:id.repeat(64).slice(0,64),
 objectFamilyId:id,structuralFeaturesVersion:"v1",rightsStatus:"approved",culturalReview:"approved",
 operations:["repeat","interrupt"],...patch
});
describe("reference structural rule gates",()=>{
 it("requires independently evidenced operations",()=>{
  const result=extractStructuralRules([item("a"),item("b")]);
  expect(result.rules.map(r=>r.operation)).toEqual(["repeat","interrupt"]);
  expect(result.rules[0]!.supportingObjectIds).toEqual(["a","b"]);
 });
 it("excludes restricted, pending and duplicate source families",()=>{
  const result=extractStructuralRules([item("a"),item("b",{rightsStatus:"research-only"}),item("c",{culturalReview:"restricted"}),item("d",{institution:"Museum a",objectFamilyId:"a"}),item("e",{imageSha256:"a".repeat(64)})]);
  expect(result.rules).toEqual([]);
  expect(result.excluded).toHaveLength(4);
 });
 it("does not count the same object ID twice even with different hash and institution",()=>{
  const duplicate=item("a",{institution:"Different museum",objectUrl:"https://elsewhere.org/different",imageSha256:"b".repeat(64),objectFamilyId:"new-family"});
  const result=extractStructuralRules([item("a"),duplicate]);
  expect(result.rules).toEqual([]);
  expect(result.excluded.map(x=>x.reason)).toContain("duplicate-image-or-object-family");
 });
 it("does not count two IDs pointing at the same source URL as independent",()=>{
  const result=extractStructuralRules([item("a"),item("b",{objectUrl:"https://example.org/a#image-detail"})]);
  expect(result.rules).toEqual([]);
  expect(result.excluded.map(x=>x.reason)).toContain("duplicate-image-or-object-family");
 });
 it("normalizes hash and family identities and fails closed on invalid records",()=>{
  const duplicateHash=extractStructuralRules([item("a"),item("b",{imageSha256:"A".repeat(64)})]);
  expect(duplicateHash.rules).toEqual([]);
  const duplicateFamily=extractStructuralRules([item("a"),item("b",{institution:"museum A",objectFamilyId:"A"})]);
  expect(duplicateFamily.rules).toEqual([]);
  const malformed=extractStructuralRules([item("a"),item("b",{operations:null as unknown as ReferenceEvidence["operations"]})]);
  expect(malformed.rules).toEqual([]);
  expect(malformed.excluded.map(x=>x.reason)).toContain("missing-or-invalid-provenance");
  const badUrl=extractStructuralRules([item("a"),item("b",{objectUrl:"file:///tmp/source"})]);
  expect(badUrl.rules).toEqual([]);
 });
 it("rejects unsupported lineage and never grants manufacturing validation",()=>{
  const rules=extractStructuralRules([item("a"),item("b")]).rules;
  const lineage=buildCandidateLineage({canonicalGeometryVersion:"ascend-source-v1",glyphInstanceIds:["seed-1"],ruleIds:["structural:repeat"]},rules);
  expect(lineage.sourceObjectIds).toEqual(["a","b"]);
  expect(lineage.manufacturerValidated).toBe(false);
  expect(lineage.physicallyValidated).toBe(false);
  expect(()=>buildCandidateLineage({canonicalGeometryVersion:"",glyphInstanceIds:["seed-1"],ruleIds:[]},rules)).toThrow();
  expect(()=>buildCandidateLineage({canonicalGeometryVersion:"v1",glyphInstanceIds:["seed-1"],ruleIds:["structural:mirror"]},rules)).toThrow();
 });
});
