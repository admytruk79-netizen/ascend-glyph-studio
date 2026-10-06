import {describe,expect,it} from "vitest";
import {PILOT_SIZE_PROFILES,resolvePilotShirtMeasurements} from "../src/shirt-measurements";
import {buildPilotShirtPattern} from "../src/pilot-shirt";
import {validatePattern} from "../src/pattern";
import {mapGarmentZonesToPieces} from "../src/pattern-projector";
import {compileProductionManifest} from "../src/production-package";
import {pilotGarment} from "../src/pilot-runner";
import type {PilotBlockSpec} from "../src/pilot-block";

describe("pilot production provenance",()=>{
 it("keeps provisional measurements and pattern pieces at reference confidence",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;
  const resolved=resolvePilotShirtMeasurements(size);
  expect(resolved.errors).toEqual([]);
  expect(resolved.sourceState).toBe("reference");
  const pattern=buildPilotShirtPattern(size);
  expect(validatePattern(pattern)).toEqual([]);
  expect(pattern.pieces.length).toBeGreaterThan(0);
  expect(pattern.pieces.every(p=>p.sourceState==="reference")).toBe(true);
  const mapped=mapGarmentZonesToPieces(pattern);
  expect(mapped.map(x=>x.pieceId)).toEqual(pattern.pieces.map(x=>x.id));
  expect(mapped.flatMap(x=>x.zones).some(z=>z.kind==="sleeve"&&!!z.wrapGroupId)).toBe(true);
 });
 it("accepts a complete sourced block and promotes only its supplied geometry",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;
  const reference=buildPilotShirtPattern(size);
  const pieces=Object.fromEntries(reference.pieces.map(p=>[p.kind,{kind:p.kind,outline:p.outline.map(q=>({...q})),grainline:{from:{...p.grainline.from},to:{...p.grainline.to}}}])) as PilotBlockSpec["pieces"];
  const block:PilotBlockSpec={id:"test-tech-pack",revision:"1",sourceId:"test-fixture",sourceState:"pattern-specified",pieces};
  const pattern=buildPilotShirtPattern(size,block);
  expect(validatePattern(pattern)).toEqual([]);
  expect(pattern.pieces.every(p=>p.sourceState==="pattern-specified")).toBe(true);
  expect(pattern.id).toContain("test-tech-pack");
 });
 it("rejects incomplete sourced blocks instead of falling back silently",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;
  const block:PilotBlockSpec={id:"bad",revision:"1",sourceId:"test-fixture",sourceState:"pattern-specified",pieces:{}};
  expect(()=>buildPilotShirtPattern(size,block)).toThrow(/missing-block-piece:front-left/);
 });
 it("blocks production approval for the reference pilot pattern",()=>{
  const garment=pilotGarment("pilot-m");
  const pattern=buildPilotShirtPattern(garment.size);
  const manifest=compileProductionManifest({garment,pattern,genomeId:"test-genome",process:"machine-embroidery"});
  expect(manifest.productionApproved).toBe(false);
  expect(manifest.confidence).toBe("reference-published");
  expect(manifest.blockers).toContain("reference-pattern-requires-validation");
 });
});
