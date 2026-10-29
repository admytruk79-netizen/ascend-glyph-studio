import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import type {StitchIrObject} from "../src/production-stitch-ir";
import {measureStitchCoverageBudget} from "../src/stitch-coverage-budget";

const zone:GarmentZone={id:"coverage",kind:"sleeve",surface:"cylinder",
 circumferenceMm:120,heightMm:60,editable:true,wrapAllowed:true,seamPositions:[0]};
const band={minYmm:10,maxYmm:50};
const line=(id:string,x0:number,y0:number,x1:number,y1:number):StitchIrObject=>({
 kind:"run",id,color:"#111111",path:[{x:x0,y:y0},{x:x1,y:y1}],length:2.5
});
describe("final stitch-IR coverage budget (digital estimate only)",()=>{
 it("reports deterministic motif distribution and negative space without changing geometry",()=>{
  const objects=[line("ascend:axis:p0",8,30,112,30)];
  const before=JSON.stringify(objects);
  const a=measureStitchCoverageBudget(objects,zone,band,2);
  const b=measureStitchCoverageBudget(objects,zone,band,2);
  expect(a).toEqual(b);
  expect(JSON.stringify(objects)).toBe(before);
  expect(a.evidence).toBe("DIGITAL_RASTER_ESTIMATE");
  expect(a.motifCoverage).toBeGreaterThan(0);
  expect(a.motifCoverage).toBeLessThan(.4);
  expect(a.horizontalMotifSpan).toBeGreaterThan(.7);
  expect(a.verticalMotifSpan).toBeLessThan(.4);
  expect(a.motifCoverageByThird.every(n=>n>0)).toBe(true);
  expect(a.connectorCoverage).toBe(0);
  expect(a.framingCoverage).toBe(0);
 });
 it("never mistakes rails and experimental connectors for canonical motif coverage",()=>{
  const onlyHelpers=[
   line("composition:rail-top",3,12,117,12),
   line("connector:0",20,30,100,30)
  ];
  const report=measureStitchCoverageBudget(onlyHelpers,zone,band,2);
  expect(report.motifCoverage).toBe(0);
  expect(report.horizontalMotifSpan).toBe(0);
  expect(report.connectorCoverage).toBeGreaterThan(0);
  expect(report.framingCoverage).toBeGreaterThan(0);
  expect(report.totalCoverage).toBeGreaterThan(0);
  expect(report.largestEmptyColumnRun).toBe(1);
 });
 it("counts satin width and filled geometry rather than treating every path as a hairline",()=>{
  const satin:StitchIrObject={kind:"satin",id:"seed:p0",color:"#111111",
   path:[{x:20,y:30},{x:100,y:30}],width:4};
  const run=line("seed:p0",20,30,100,30);
  const fill:StitchIrObject={kind:"fill",id:"enclosure:p0",color:"#111111",
   polygon:[{x:20,y:20},{x:100,y:20},{x:100,y:40},{x:20,y:40},{x:20,y:20}]};
  const r=measureStitchCoverageBudget([run],zone,band,2);
  const s=measureStitchCoverageBudget([satin],zone,band,2);
  const f=measureStitchCoverageBudget([fill],zone,band,2);
  expect(s.motifCoverage).toBeGreaterThan(r.motifCoverage);
  expect(f.motifCoverage).toBeGreaterThan(s.motifCoverage);
 });
 it("masks the actual tapered circumference and rejects malformed bands and paths",()=>{
  const taper:GarmentZone={...zone,surface:"tapered-cylinder",
   circumferenceMm:120,circumferenceEndMm:60};
  const r=measureStitchCoverageBudget([line("axis:p0",100,45,110,45)],taper,band,2);
  const cylinder=measureStitchCoverageBudget([line("axis:p0",100,45,110,45)],zone,band,2);
  expect(r.validCells).toBeLessThan(cylinder.validCells);
  expect(r.motifCoverage).toBe(0);
  expect(()=>measureStitchCoverageBudget([],zone,{minYmm:-1,maxYmm:50},2)).toThrow();
  expect(()=>measureStitchCoverageBudget([line("bad",NaN,30,40,30)],zone,band,2)).toThrow();
 });
});
