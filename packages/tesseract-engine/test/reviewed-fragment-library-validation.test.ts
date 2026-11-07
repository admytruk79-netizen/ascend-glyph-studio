import {describe,it,expect} from "vitest";
import {validateReviewedFragmentBenchmarkLibrary as validate} from "../src/reviewed-fragment-library-validation";
const tradition="ukrainian-ornament";
const fragment=()=>({id:"reviewed-structural:repeat",source:{id:"structural:repeat",traditionId:tradition,sourceIds:["museum-1","museum-2"],access:"documented-public",rights:"permitted-structural-study",verified:true},relations:["flow","return"],nodeCount:0,edgeCount:0,scaleRatios:[]});
const exportData=()=>({schema:"ascend.reviewed-fragment-library.v1",status:"structural-reference-only",manufacturerValidated:false,physicallyValidated:false,libraries:{[tradition]:{fragments:[fragment()],rejected:[]}}});
describe("reviewed fragment benchmark admission",()=>{
 it("accepts a structurally valid reference-only export",()=>expect(validate(exportData(),tradition).fragments).toHaveLength(1));
 it("rejects production-mislabeled and missing-review exports",()=>{
  expect(()=>validate({...exportData(),manufacturerValidated:true},tradition)).toThrow();
  expect(()=>validate({...exportData(),status:"production-validated"},tradition)).toThrow();
 });
 it("rejects cross-tradition and restricted sources",()=>{
  const a=exportData();a.libraries[tradition].fragments[0].source.traditionId="other";
  expect(()=>validate(a,tradition)).toThrow(/tradition/);
  const b=exportData();b.libraries[tradition].fragments[0].source.access="sacred-restricted";
  expect(()=>validate(b,tradition)).toThrow(/cultural access/);
 });
 it("rejects duplicated evidence, unknown relations, and duplicate fragment IDs",()=>{
  const a=exportData();a.libraries[tradition].fragments[0].source.sourceIds=["museum-1","museum-1"];
  expect(()=>validate(a,tradition)).toThrow(/distinct/);
  const b=exportData();b.libraries[tradition].fragments[0].relations=["copy-contour"];
  expect(()=>validate(b,tradition)).toThrow(/relations/);
  const c=exportData();c.libraries[tradition].fragments.push(fragment());
  expect(()=>validate(c,tradition)).toThrow(/duplicate/);
 });
 it("rejects empty libraries without inventing fixtures",()=>{
  const a=exportData();a.libraries[tradition].fragments=[];
  expect(()=>validate(a,tradition)).toThrow(/No independently reviewed/);
 });
});
