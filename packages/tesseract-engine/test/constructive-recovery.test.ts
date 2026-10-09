import {describe,it,expect} from "vitest";
import {refineOrnamentalLayout} from "../src/ornament-optimizer";
import type {Topology} from "../src/topology";
import type {Layout} from "../src/relational-layout";
import {insideZone,overlapsRotated} from "../src/rotated-footprints";
describe("constructive geometry recovery",()=>{
 it("recovers from an invalid overlapping initial placement with physical footprints",()=>{
  const topology:Topology={nodes:[{id:"a",conceptId:"roots",form:"axis",scale:1},{id:"b",conceptId:"sun",form:"axis",scale:1},{id:"c",conceptId:"seed",form:"axis",scale:1}],edges:[]};
  const layout:Layout={iterations:0,energy:0,points:{
   a:{x:50,y:25,scale:1,angleDeg:0,layer:1},
   b:{x:50,y:25,scale:1,angleDeg:0,layer:1},
   c:{x:50,y:25,scale:1,angleDeg:0,layer:1}
  }};
  const footprints=Object.fromEntries(topology.nodes.map(n=>[n.id,{widthMm:28,heightMm:16,originalScale:1}]));
  const result=refineOrnamentalLayout(topology,layout,200,60,"construct",undefined,{iterations:0,physicalFootprints:footprints,minGapMm:2});
  const points=topology.nodes.map(n=>result.points[n.id]!);
  const rects=points.map(p=>({x:p.x,y:p.y,angleDeg:p.angleDeg,width:28*p.scale,height:16*p.scale}));
  for(const rect of rects)expect(insideZone(rect,200,60,2)).toBe(true);
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)expect(overlapsRotated(rects[i]!,rects[j]!,2)).toBe(false);
  expect(refineOrnamentalLayout(topology,layout,200,60,"construct",undefined,{iterations:0,physicalFootprints:footprints,minGapMm:2})).toEqual(result);
 });
});
