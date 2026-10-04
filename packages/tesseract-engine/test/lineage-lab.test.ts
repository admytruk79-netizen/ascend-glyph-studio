import {describe,it,expect} from "vitest";
import {runLineageLab} from "../src/lineage-lab";

describe("lineage lab",()=>{
 it("deduplicates lineages and emits a specimen sheet",()=>{
  const r=runLineageLab({
   intent:{concepts:[{id:"ancestry",weight:1},{id:"freedom",weight:.8}],traditions:[]},
   principles:[],population:8,generations:1,seeds:["a","b"],keepPerSeed:4,finalKeep:8
  });
  expect(r.runs).toBe(2);
  expect(r.rawCandidates).toBeGreaterThan(0);
  expect(r.uniqueLineages).toBeGreaterThan(0);
  expect(r.survivors.length).toBeLessThanOrEqual(r.uniqueLineages);
  expect(r.specimenSheet.svg).toContain('data-tesseract="lineage-specimens"');
 });
});
