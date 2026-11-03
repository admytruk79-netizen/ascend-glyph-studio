import {describe,it,expect} from "vitest";
import {extractStructuralFragments,recombineStructuralFragments} from "../src/structural-fragments";
import type {Topology} from "../src/topology";
const base:Topology={nodes:[{id:"a",conceptId:"origin",form:"seed",scale:1},{id:"b",conceptId:"ascent",form:"axis",scale:2},{id:"c",conceptId:"return",form:"orbit",scale:3}],edges:[{from:"a",to:"b",relation:"flow",weight:1}]};
const source=(id:string,access:"public"|"sacred-restricted"="public")=>({id,traditionId:"ukrainian-ornament",sourceIds:["museum-record-"+id],access,rights:"permitted-structural-study" as const,verified:true});
describe("structural fragment synthesis",()=>{
 it("rejects restricted and unlicensed sources",()=>{
  const out=extractStructuralFragments([{source:source("safe"),topology:base},{source:source("sacred","sacred-restricted"),topology:base},{source:{...source("unknown"),rights:"unknown" as const},topology:base}]);
  expect(out.fragments).toHaveLength(1);expect(out.rejected.map(x=>x.reason)).toEqual(["cultural-access-restricted","rights-not-cleared"]);
 });
 it("does not retain historical node forms or geometry",()=>{
  const historical:Topology={nodes:[{id:"historical-a",conceptId:"x",form:"historical-diamond",scale:10},{id:"historical-b",conceptId:"y",form:"historical-flower",scale:20}],edges:[{from:"historical-a",to:"historical-b",relation:"branch",weight:1}]};
  const library=extractStructuralFragments([{source:source("safe"),topology:historical}]);
  const result=recombineStructuralFragments(base,library,"seed");
  expect(result.topology.nodes).toEqual(base.nodes);
  expect(JSON.stringify(result.topology)).not.toContain("historical-diamond");
  expect(result.status).toBe("structural-reference-only");
 });
 it("is deterministic, leaves input untouched and carries source lineage",()=>{
  const library=extractStructuralFragments([{source:source("safe"),topology:{...base,edges:[{from:"a",to:"b",relation:"branch",weight:1},{from:"b",to:"c",relation:"intersect",weight:1}]}}]);
  const before=JSON.stringify(base);
  const a=recombineStructuralFragments(base,library,"stable"),b=recombineStructuralFragments(base,library,"stable");
  expect(a).toEqual(b);expect(JSON.stringify(base)).toBe(before);
  expect(a.sourceIds.every(id=>id==="museum-record-safe")).toBe(true);
 });
 it("fails closed for empty or restricted-only libraries",()=>{
  const library=extractStructuralFragments([{source:source("restricted","sacred-restricted"),topology:base}]);
  expect(recombineStructuralFragments(base,library,"seed").topology).toEqual(base);
 });
});
