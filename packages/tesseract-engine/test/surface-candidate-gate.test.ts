import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import {evaluateSurfaceLayout,type SurfaceFootprint} from "../src/garment-surface-math";
import {assessCandidateSurface} from "../src/surface-candidate-gate";

const sleeve:GarmentZone={
  id:"pilot-sleeve",kind:"sleeve",surface:"tapered-cylinder",
  circumferenceMm:360,circumferenceEndMm:240,heightMm:600,
  editable:true,wrapAllowed:true,seamPositions:[0]
};
const item=(id:string,u:number,v:number):SurfaceFootprint=>({id,u,v,widthMm:30,heightMm:30,clearanceMm:2});

describe("final stitch footprint candidate gate",()=>{
  it("rejects colliding embroidery footprints",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("a",100,100),item("b",110,100)]);
    expect(assessCandidateSurface(report,"avoid")).toEqual({valid:false,errors:["surface-collisions:1"]});
  });
  it("accepts separated footprints",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("a",100,100),item("b",200,300)]);
    expect(assessCandidateSurface(report,"avoid")).toEqual({valid:true,errors:[]});
  });
  it("rejects crossings under the avoid seam policy",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("seam-motif",5,100)]);
    expect(assessCandidateSurface(report,"avoid")).toEqual({valid:false,errors:["seam-crossings:seam-motif"]});
  });
  it("does not reject a crossing solely for seam policy continuous",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("seam-motif",5,100)]);
    expect(assessCandidateSurface(report,"continuous")).toEqual({valid:true,errors:[]});
  });
  it("honors explicit nest/enclose overlap exemptions from surface evaluation",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("a",100,100),item("b",110,100)],{allowedOverlapPairs:["a|b"]});
    expect(assessCandidateSurface(report,"avoid")).toEqual({valid:true,errors:[]});
  });
  it("does not allow an unrelated collision through an allowed pair",()=>{
    const report=evaluateSurfaceLayout(sleeve,[item("a",100,100),item("b",110,100),item("c",120,100)],{allowedOverlapPairs:["a|b"]});
    expect(assessCandidateSurface(report,"avoid").valid).toBe(false);
  });
});
