import {describe,it,expect} from "vitest";
import {planRegisteredHoops} from "../src/multi-hoop-registration";
const reference={machineId:"reference-only",widthMm:360,heightMm:500,fieldXmm:356,fieldYmm:203,overlapMm:15,registrationToleranceMm:1};
describe("registered multi-hoop reference planning",()=>{
 it("creates bounded tiles and joins without production approval",()=>{
  const p=planRegisteredHoops(reference);
  expect(p.errors).toEqual([]);
  expect(p.tiles).toHaveLength(6);
  expect(p.joins).toHaveLength(7);
  expect(p.productionApproved).toBe(false);
  for(const t of p.tiles){
   expect(t.originMm.x).toBeGreaterThanOrEqual(0);
   expect(t.originMm.y).toBeGreaterThanOrEqual(0);
   expect(t.originMm.x+t.sizeMm.width).toBeLessThanOrEqual(reference.widthMm);
   expect(t.originMm.y+t.sizeMm.height).toBeLessThanOrEqual(reference.heightMm);
  }
  for(const j of p.joins){
   expect(j.overlapMm).toBeGreaterThan(0);
   expect(j.requiresNoGoClearance).toBe(true);
  }
 });
 it("fails closed on invalid reference settings",()=>{
  for(const patch of [{overlapMm:0},{overlapMm:203},{fieldXmm:0},{registrationToleranceMm:0},{machineId:""},{widthMm:NaN}]){
   const p=planRegisteredHoops({...reference,...patch});
   expect(p.errors.length).toBeGreaterThan(0);
   expect(p.tiles).toHaveLength(0);
   expect(p.productionApproved).toBe(false);
  }
 });
 it("keeps a single-field design in one tile",()=>{
  const p=planRegisteredHoops({...reference,widthMm:100,heightMm:100});
  expect(p.tiles).toHaveLength(1);
  expect(p.joins).toHaveLength(0);
  expect(p.productionApproved).toBe(false);
 });
});
