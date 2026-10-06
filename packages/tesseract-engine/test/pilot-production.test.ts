import {describe,expect,it} from "vitest";
import {PILOT_SIZE_PROFILES,resolvePilotShirtMeasurements} from "../src/shirt-measurements";
import {buildPilotShirtPattern} from "../src/pilot-shirt";
import {validatePattern} from "../src/pattern";
import {compileProductionManifest} from "../src/production-package";
import {pilotGarment} from "../src/pilot-runner";

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
