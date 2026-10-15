import {describe,it,expect} from "vitest";
import {fitCompositionPrior} from "../src/composition-prior-fit";
import type {ImageObservation} from "../src/image-corpus";
const observation=(id:string,operations:string[]):ImageObservation=>({id,sourceRef:"object:"+id,class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",provenance:"museum collection object "+id,features:{operations,symmetry:.2,periodicity:.8,scaleLevels:4},notes:[]});
describe("evidence-derived composition fitting",()=>{
 it("fits normalized structural operations without copying geometry",()=>{
  const p=fitCompositionPrior([observation("1",["repeat","nest"]),observation("2",["branch"]),observation("3",["repeat"])]);
  expect(p?.evidenceImages).toBe(3);expect(p?.relationWeights.repeat).toBeCloseTo(2/3);expect(p?.mirrorStrength).toBeCloseTo(.2);expect(p?.preferredScaleRatio).toBe(.5);
 });
 it("rejects unverified generated images and low sample count",()=>{
  const a=observation("1",["repeat"]); const generated={...a,id:"g",sourceRef:"g",class:"ascend-generated" as const,verifiedReal:false};
  expect(fitCompositionPrior([a,generated])).toBeUndefined();
 });
 it("deduplicates source references",()=>{
  const a=observation("1",["repeat"]);const b={...observation("2",["branch"]),sourceRef:a.sourceRef};
  expect(fitCompositionPrior([a,b,observation("3",["nest"])])).toBeUndefined();
 });
 it("does not accept a missing provenance record",()=>{
  const xs=[observation("1",["repeat"]),observation("2",["repeat"]),{...observation("3",["repeat"]),provenance:""}];
  expect(fitCompositionPrior(xs)).toBeUndefined();
 });
});
