import {describe,it,expect} from "vitest";
import {refineOrnamentalLayout} from "../src/ornament-optimizer";
import type {Topology} from "../src/topology";
import type {Layout} from "../src/relational-layout";

const topology:Topology={
 nodes:[
  {id:"a",conceptId:"roots",form:"axis",scale:1},
  {id:"b",conceptId:"lineage",form:"seed",scale:1},
  {id:"c",conceptId:"ascent",form:"axis",scale:1}
 ],
 edges:[{from:"a",to:"b",relation:"nest",weight:1},{from:"b",to:"c",relation:"flow",weight:1}]
};
const layout:Layout={iterations:72,energy:1,points:{
 a:{x:45,y:40,angleDeg:0,scale:1,layer:1},
 b:{x:90,y:40,angleDeg:0,scale:1,layer:1},
 c:{x:145,y:40,angleDeg:0,scale:1,layer:1}
}};
describe("ornament optimization",()=>{
 it("is reproducible for seed and preserves source layout",()=>{
  const initial=JSON.stringify(layout);
  const a=refineOrnamentalLayout(topology,layout,220,90,"demo",undefined,{iterations:100,minGapMm:2});
  const b=refineOrnamentalLayout(topology,layout,220,90,"demo",undefined,{iterations:100,minGapMm:2});
  expect(a).toEqual(b);
  expect(JSON.stringify(layout)).toBe(initial);
  expect(Object.keys(a.points).sort()).toEqual(["a","b","c"]);
 });
 it("keeps unwrapped placements within boundaries",()=>{
  const x=refineOrnamentalLayout(topology,layout,220,90,"bounds",undefined,{iterations:150,minGapMm:2});
  for(const p of Object.values(x.points)){
   expect(Number.isFinite(p.x+p.y+p.angleDeg)).toBe(true);
   expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(220);
   expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(90);
  }
 });
 it("supports zero iterations without changing the original coordinates",()=>{
  const x=refineOrnamentalLayout(topology,layout,220,90,"off",undefined,{iterations:0});
  expect(x.points).toEqual(layout.points);
 });
});
