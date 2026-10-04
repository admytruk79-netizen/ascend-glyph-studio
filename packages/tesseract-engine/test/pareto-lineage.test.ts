import {describe,it,expect} from "vitest";
import {paretoSelect,type ObjectiveVector} from "../src/pareto";
import {nameLineage} from "../src/lineage";
import type {Topology} from "../src/topology";

const objectives=(meaning:number,novelty:number):ObjectiveVector=>({
 meaning,novelty,culturalIntegrity:.8,manufacturability:.8,visualIdentity:.8,physicalConfidence:.5,genericResistance:.8
});

describe("Pareto lineage evolution",()=>{
 it("preserves distinct non-dominated solutions",()=>{
  const xs=[
   {item:"meaning",objectives:objectives(1,.4)},
   {item:"novelty",objectives:objectives(.4,1)},
   {item:"weak",objectives:objectives(.3,.3)}
  ];
  const selected=paretoSelect(xs,2).map(x=>x.item);
  expect(selected).toContain("meaning");
  expect(selected).toContain("novelty");
  expect(selected).not.toContain("weak");
 });

 it("records lineage ancestry without changing structural identity",()=>{
  const t:Topology={
   nodes:[
    {id:"a",conceptId:"origin",form:"seed",scale:1},
    {id:"b",conceptId:"lineage",form:"bifurcation",scale:2}
   ],
   edges:[{from:"a",to:"b",relation:"branch",weight:1}]
  };
  const root=nameLineage(t,0,undefined);
  const child=nameLineage(t,1,undefined,[root.id,"lin-other",root.id]);
  expect(child.id).toBe(root.id);
  expect(child.parentIds).toEqual([root.id,"lin-other"]);
  expect(child.generation).toBe(1);
  expect(child.character).toContain("branching");
 });
});
