import {describe,it,expect} from "vitest";
import {fragmentLibraryFromReviewedRules} from "../src/reviewed-fragment-adapter";
import {recombineStructuralFragments} from "../src/structural-fragments";
import type {Topology} from "../src/topology";
describe("reviewed rule adapter",()=>{
 it("adapts only approved, independently supported structural rules",()=>{
  const out=fragmentLibraryFromReviewedRules([
   {ruleId:"structural:branch",operation:"branch",supportingObjectIds:["museum:1","museum:2"],independentInstitutions:1,evidenceStatus:"approved"},
   {ruleId:"structural:mirror",operation:"mirror",supportingObjectIds:["museum:3","museum:4"],independentInstitutions:1,evidenceStatus:"research-only"}
  ]);
  expect(out.fragments).toHaveLength(1);
  expect(out.fragments[0]?.source.sourceIds).toEqual(["museum:1","museum:2"]);
  expect(out.rejected).toHaveLength(1);
 });
 it("recombines without introducing historical nodes",()=>{
  const lib=fragmentLibraryFromReviewedRules([{ruleId:"structural:branch",operation:"branch",supportingObjectIds:["m:1","m:2"],independentInstitutions:1,evidenceStatus:"approved"}]);
  const base:Topology={nodes:[{id:"ascend-a",conceptId:"a",form:"seed",scale:1},{id:"ascend-b",conceptId:"b",form:"axis",scale:2}],edges:[]};
  const out=recombineStructuralFragments(base,lib,"seed");
  expect(out.topology.nodes).toEqual(base.nodes);
  expect(out.sourceIds.every(x=>x.startsWith("m:"))).toBe(true);
 });
});
