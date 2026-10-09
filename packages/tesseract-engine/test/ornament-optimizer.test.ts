import {describe,it,expect} from "vitest";
import {refineOrnamentalLayout} from "../src/ornament-optimizer";
import {placeProductionObjects,type ProductionGlyphObject} from "../src/production-object";
import type {Topology} from "../src/topology";
import type {Layout} from "../src/relational-layout";

const topology:Topology={
 nodes:[
  {id:"a",conceptId:"roots",form:"axis",scale:1},
  {id:"b",conceptId:"lineage",form:"seed",scale:1},
  {id:"c",conceptId:"ascent",form:"axis",scale:1}
 ],
 edges:[{from:"a",to:"b",relation:"flow",weight:1},{from:"b",to:"c",relation:"flow",weight:1}]
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
 it("propagates optimized scale into production dimensions and satin stitch width",()=>{
  const object={id:"a",physical:{widthMm:20,heightMm:20,minScale:.5,maxScale:3,clearanceMm:1,rotationDeg:0},placement:{zoneId:"cuff",seamPolicy:"avoid",canRotate:true,wrapAllowed:false},embroidery:{stitchFamily:"satin",spacingMm:.4,underlay:["center-walk"],pullCompMm:{left:.25,right:.25},satinWidthMm:2,repeats:1,preserveRoutingParameters:true}} as unknown as ProductionGlyphObject;
  const out=placeProductionObjects([object],{a:{x:30,y:40,angleDeg:30,scale:1.2}},{a:{scale:1}});
  expect(out[0]!.physical.widthMm).toBeCloseTo(24);
  expect(out[0]!.embroidery.satinWidthMm).toBeCloseTo(2.4);
  expect(out[0]!.placement.rotationDeg).toBe(30);
 });
 it("rejects invalid containment rather than passing it to embroidery",()=>{
  const nested:Topology={nodes:topology.nodes.slice(0,2),edges:[{from:"a",to:"b",relation:"nest",weight:1}]};
  expect(()=>refineOrnamentalLayout(nested,layout,220,90,"invalid-nest",undefined,{iterations:0})).toThrow("ornament-nesting-clearance");
 });
 it("returns a valid packed state rather than an invalid final annealing step",()=>{
  const x=refineOrnamentalLayout(topology,layout,220,90,"packed",undefined,{iterations:500,minGapMm:3});
  const ids=topology.nodes.map(n=>n.id);
  const radius=Math.min(24,90*.105);
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const a=x.points[ids[i]!]!,b=x.points[ids[j]!]!;
   expect(Math.hypot(a.x-b.x,a.y-b.y)+1e-6).toBeGreaterThanOrEqual(radius*(a.scale+b.scale)+3);
  }
 });
 it("rejects a collision visible only with actual production dimensions",()=>{
  const t:Topology={nodes:topology.nodes.slice(0,2),edges:[]};
  const footprints={a:{widthMm:80,heightMm:80,originalScale:1},b:{widthMm:80,heightMm:80,originalScale:1}};
  expect(()=>refineOrnamentalLayout(t,layout,220,90,"physical",undefined,{iterations:0,physicalFootprints:footprints})).toThrow(/ornament-/);
 });
 it("rejects production scale beyond the permitted ratio",()=>{
  const object={id:"a",physical:{widthMm:20,heightMm:20,minScale:.5,maxScale:3,clearanceMm:1,rotationDeg:0},placement:{zoneId:"cuff",seamPolicy:"avoid",canRotate:true,wrapAllowed:false},embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true}} as unknown as ProductionGlyphObject;
  expect(()=>placeProductionObjects([object],{a:{x:30,y:40,angleDeg:0,scale:2}},{a:{scale:1}})).toThrow("ornament-production-scale-out-of-range");
 });
 it("supports zero iterations without changing the original coordinates",()=>{
  const x=refineOrnamentalLayout(topology,layout,220,90,"off",undefined,{iterations:0});
  expect(x.points).toEqual(layout.points);
 });
});
