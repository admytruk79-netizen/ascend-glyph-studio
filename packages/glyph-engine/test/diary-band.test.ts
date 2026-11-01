import {describe,it,expect} from "vitest";
import {buildDiaryBand,assertProductionBand} from "../src/diary-band";

describe("ASCEND diary band engine",()=>{
 it("builds a production-safe band only from verified canonical glyphs",()=>{
  const band=buildDiaryBand("water-v1","hutsul",["water-02","water-03"]);
  expect(band.productionReady).toBe(true);
  expect(band.placements.length).toBeGreaterThan(20);
  expect(()=>assertProductionBand(band)).not.toThrow();
 });
 it("fails closed when an unresolved glyph enters a band",()=>{
  const band=buildDiaryBand("mixed","podillia",["water-02","earth-01"]);
  expect(band.productionReady).toBe(false);
  expect(band.blockedGlyphIds).toContain("earth-01");
  expect(()=>assertProductionBand(band)).toThrow(/NON-PRODUCTION/);
 });
 it("creates mirrored satellites and guards instead of mutating geometry",()=>{
  const band=buildDiaryBand("mirror","poltava",["water-02","water-03"]);
  expect(band.placements.some(p=>p.mirrorX&&p.role==="satellite")).toBe(true);
  expect(band.placements.some(p=>p.role==="guard")).toBe(true);
 });
});
