import {describe,expect,it} from "vitest";
import {PILOT_SIZE_PROFILES,resolvePilotShirtMeasurements} from "../src/shirt-measurements";
import {buildPilotShirtPattern} from "../src/pilot-shirt";
import {validatePattern} from "../src/pattern";
import {mapGarmentZonesToPieces} from "../src/pattern-projector";
import {compileProductionManifest} from "../src/production-package";
import {pilotGarment} from "../src/pilot-runner";
import type {PilotBlockSpec} from "../src/pilot-block";

function sourcedFixture():PilotBlockSpec{
 const size=PILOT_SIZE_PROFILES[1]!;
 const reference=buildPilotShirtPattern(size);
 const pieces=Object.fromEntries(reference.pieces.map(p=>[p.kind,{kind:p.kind,outline:p.outline.map(q=>({...q})),grainline:{from:{...p.grainline.from},to:{...p.grainline.to}},
  designZones:p.designZones.map(z=>({...z,polygon:z.polygon.map(q=>({...q}))})),noGoZones:p.noGoZones.map(z=>({...z,polygon:z.polygon.map(q=>({...q}))})),seams:[]}])) as PilotBlockSpec["pieces"];
 const left=pieces["sleeve-left"]!,cuff=pieces["cuff-left"]!;
 left.seams=[{id:"left-cuff",kind:"cuff-join",edge:"sleeve-opening",edgePath:[{x:0,y:0},{x:100,y:0}],joins:{pieceKind:"cuff-left",seamId:"cuff-sleeve"},allowanceMm:10,crossDesignAllowed:true,registrationToleranceMm:2,registrationAnchors:[{x:50,y:0}]}];
 cuff.seams=[{id:"cuff-sleeve",kind:"cuff-join",edge:"cuff-top",edgePath:[{x:0,y:0},{x:100,y:0}],joins:{pieceKind:"sleeve-left",seamId:"left-cuff"},allowanceMm:10,crossDesignAllowed:true,registrationToleranceMm:2,registrationAnchors:[{x:50,y:0}]}];
 return {id:"test-tech-pack",revision:"1",sourceId:"test-fixture",sourceState:"pattern-specified",pieces};
}

describe("pilot production provenance",()=>{
 it("keeps provisional measurements and pattern pieces at reference confidence",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;const resolved=resolvePilotShirtMeasurements(size);
  expect(resolved.errors).toEqual([]);expect(resolved.sourceState).toBe("reference");
  const pattern=buildPilotShirtPattern(size);expect(validatePattern(pattern)).toEqual([]);
  expect(pattern.pieces.length).toBeGreaterThan(0);expect(pattern.pieces.every(p=>p.sourceState==="reference")).toBe(true);
  const mapped=mapGarmentZonesToPieces(pattern);expect(mapped.map(x=>x.pieceId)).toEqual(pattern.pieces.map(x=>x.id));
  expect(mapped.flatMap(x=>x.zones).some(z=>z.kind==="sleeve"&&!!z.wrapGroupId)).toBe(true);
 });
 it("accepts sourced geometry, zones, construction constraints and reciprocal seams",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;const pattern=buildPilotShirtPattern(size,sourcedFixture());
  expect(validatePattern(pattern)).toEqual([]);expect(pattern.pieces.every(p=>p.sourceState==="pattern-specified")).toBe(true);
  expect(pattern.seamGraph).toContainEqual({fromPiece:"cuff-left",fromSeam:"cuff-sleeve",toPiece:"sleeve-left",toSeam:"left-cuff"});
  expect(pattern.pieces.find(p=>p.kind==="sleeve-left")!.seams[0]!.edge).toBe("sleeve-opening");
  expect(pattern.pieces.find(p=>p.kind==="sleeve-left")!.noGoZones.length).toBeGreaterThan(0);
 });
 it("rejects incomplete sourced blocks instead of falling back silently",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;const block:PilotBlockSpec={id:"bad",revision:"1",sourceId:"test-fixture",sourceState:"pattern-specified",pieces:{}};
  expect(()=>buildPilotShirtPattern(size,block)).toThrow(/missing-block-piece:front-left/);
 });
 it("rejects nonreciprocal sourced seam joins",()=>{
  const size=PILOT_SIZE_PROFILES[1]!;const block=sourcedFixture();block.pieces["cuff-left"]!.seams[0]!.joins=undefined;
  expect(()=>buildPilotShirtPattern(size,block)).toThrow(/nonreciprocal-block-seam-join/);
 });
 it("blocks production approval for the reference pilot pattern",()=>{
  const garment=pilotGarment("pilot-m");const pattern=buildPilotShirtPattern(garment.size);
  const manifest=compileProductionManifest({garment,pattern,genomeId:"test-genome",process:"machine-embroidery"});
  expect(manifest.productionApproved).toBe(false);expect(manifest.confidence).toBe("reference-published");
  expect(manifest.blockers).toContain("reference-pattern-requires-validation");
 });
});
