import {describe,it,expect} from "vitest";
import {adaptForProduction} from "../src/medium-compiler";
import type {Topology} from "../src/topology";

const topology:Topology={nodes:[{id:"a",conceptId:"journey",form:"axis",scale:1},{id:"b",conceptId:"freedom",form:"crossing",scale:1}],edges:[{from:"a",to:"b",relation:"intersect",weight:1}]};
describe("medium crossing adaptation",()=>{
 it("adapts crossing forms and relations without changing the source topology",()=>{
  const initial=JSON.stringify(topology);
  for(const medium of ["leather-tooling","emboss"] as const){
   const result=adaptForProduction(topology,medium);
   expect(result.topology.nodes[1]).toEqual({...topology.nodes[1],form:"bifurcation"});
   expect(result.topology.edges).toEqual([]);
   expect(result.changes).toContain("replaced-unsupported-crossing-forms");
   expect(result.changes).toContain("removed-unsupported-crossings");
  }
  expect(JSON.stringify(topology)).toBe(initial);
 });
 it("preserves crossing geometry for media that support it",()=>{
  for(const medium of ["embroidery","print"] as const){
   const result=adaptForProduction(topology,medium);
   expect(result.topology).toEqual(topology);
   expect(result.changes).toEqual([]);
  }
 });
});
