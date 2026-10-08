import {describe,it,expect} from "vitest";
import {circumferenceAt,sleevePoint,zoneSurfaceArea,wrappedCenterDistance,juxtaposition,evaluateSurfaceLayout,type SurfaceFootprint} from "../src/garment-surface-math";
import type {GarmentZone} from "../src/garment";

const sleeve:GarmentZone={
  id:"sleeve-left",kind:"sleeve",surface:"tapered-cylinder",
  circumferenceMm:360,circumferenceEndMm:240,heightMm:600,
  editable:true,wrapAllowed:true,seamPositions:[0]
};

describe("garment sleeve surface math",()=>{
  it("interpolates circumference down a tapered sleeve",()=>{
    expect(circumferenceAt(sleeve,0)).toBe(360);
    expect(circumferenceAt(sleeve,300)).toBe(300);
    expect(circumferenceAt(sleeve,600)).toBe(240);
  });

  it("maps wrapped coordinates onto the sleeve surface",()=>{
    const p=sleevePoint(sleeve,90,0);
    expect(p.x).toBeCloseTo(0,5);
    expect(p.y).toBeCloseTo(360/(2*Math.PI),5);
    expect(p.z).toBe(0);
  });

  it("uses shortest wrapped distance across the seam",()=>{
    const a:SurfaceFootprint={id:"a",u:5,v:100,widthMm:8,heightMm:8};
    const b:SurfaceFootprint={id:"b",u:335,v:100,widthMm:8,heightMm:8};
    expect(wrappedCenterDistance(sleeve,a,b)).toBeLessThan(25);
  });

  it("checks every pair and reports collisions",()=>{
    const items:SurfaceFootprint[]=[
      {id:"a",u:100,v:100,widthMm:30,heightMm:30,clearanceMm:2},
      {id:"b",u:110,v:100,widthMm:30,heightMm:30,clearanceMm:2},
      {id:"c",u:250,v:350,widthMm:20,heightMm:20}
    ];
    const report=evaluateSurfaceLayout(sleeve,items);
    expect(report.pairwise).toHaveLength(3);
    expect(report.invalidPairs.some(x=>x.a==="a"&&x.b==="b")).toBe(true);
    expect(report.surfaceAreaMm2).toBeGreaterThan(0);
    expect(report.nominalOccupancy).toBeGreaterThan(0);
  });

  it("detects a motif crossing the sleeve seam",()=>{
    const r=evaluateSurfaceLayout(sleeve,[{id:"edge",u:4,v:50,widthMm:20,heightMm:10}]);
    expect(r.seamCrossings).toEqual(["edge"]);
  });
});
