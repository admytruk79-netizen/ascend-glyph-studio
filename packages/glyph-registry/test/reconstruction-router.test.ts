import {describe,it,expect} from "vitest";
import {reconstructionPlan} from "../src/reconstruction-router";

describe("reconstruction router",()=>{
 it("covers every registered glyph exactly once",()=>{
  expect(reconstructionPlan).toHaveLength(32);
  expect(new Set(reconstructionPlan.map(x=>x.id)).size).toBe(32);
 });
 it("routes Water/Air stroke forms away from generic silhouette tracing",()=>{
  for(const p of reconstructionPlan.filter(x=>x.id.startsWith("water-")||x.id.startsWith("air-")))
   expect(["centerline","hybrid"]).toContain(p.method);
 });
});
