import {describe,it,expect} from "vitest";
import {solve8D} from "../src/solver-v2";

describe("Tesseract 2.0",()=>{
 it("compiles intent into deterministic sparse 8D state",()=>{
  const input={
   seed:"ancestry-freedom-01",ontologyVersion:"2026.10-alpha",
   intent:{concepts:[{id:"ancestry",weight:1},{id:"freedom",weight:.9},{id:"return",weight:.7}],traditions:[{id:"ukrainian",weight:.8}]},
   principles:[{id:"p1",traditionId:"ukrainian",kind:"composition",concepts:["ancestry"],relations:["nest","repeat"],forms:["branch"],confidence:.9,access:"structural-public" as const,sourceIds:["s1"]}]
  };
  const a=solve8D(input),b=solve8D(input);
  expect(a).toEqual(b);
  expect(a.state.version).toBe(2);
  expect(a.state.dimensions.provenance[0]?.sourceId).toBe("s1");
  expect(a.topology.edges.some(e=>e.relation==="intersect")).toBe(true);
 });
 it("excludes sacred/restricted principles",()=>{
  const r=solve8D({seed:"x",ontologyVersion:"x",intent:{concepts:[{id:"protection",weight:1}]},principles:[
   {id:"restricted",traditionId:"example",kind:"motif",concepts:["protection"],relations:["enclose"],forms:["x"],confidence:1,access:"sacred-restricted",sourceIds:["s"]}
  ]});
  expect(r.state.dimensions.provenance).toHaveLength(0);
 });
});
