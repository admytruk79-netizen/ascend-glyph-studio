import {describe,expect,it} from "vitest";
import {compileProductionObjectsToStitchIr,sampleSvgPath} from "../src/production-stitch-ir";
import type {ProductionGlyphObject} from "../src/production-object";

const base:ProductionGlyphObject={
 id:"source-test",conceptId:"test",form:"axis",geometryRef:"ascend:axis",
 physical:{widthMm:20,heightMm:20,minScale:.5,maxScale:4,clearanceMm:1,rotationDeg:0},
 placement:{seamPolicy:"avoid",canRotate:true,wrapAllowed:false,xMm:50,yMm:50},
 relations:{ports:[],allowed:[]},
 embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true},
 threadColor:"#111111",sourceBasis:[]
};

describe("production stitch geometry integrity",()=>{
 it("never fabricates a motif when ASCEND source geometry is absent",()=>{
  expect(()=>compileProductionObjectsToStitchIr([{...base,form:"unmapped-form"}])).toThrow(/missing ASCEND source geometry/);
 });
 it("rejects SVG arcs and unsupported commands instead of dropping them",()=>{
  expect(()=>sampleSvgPath("M0 0 A10 10 0 0 1 20 20")).toThrow(/unsupported/);
  expect(()=>sampleSvgPath("M0 0 S10 10 20 20")).toThrow(/unsupported/);
 });
 it("rejects malformed and incomplete coordinates",()=>{
  expect(()=>sampleSvgPath("M0 0 L10")).toThrow(/incomplete/);
  expect(()=>sampleSvgPath("M0 0 L10 20 @")).toThrow(/invalid SVG path syntax/);
 });
 it("rejects compound contours until subpath-aware stitch planning exists",()=>{
  expect(()=>sampleSvgPath("M0 0 L10 10 M20 20 L30 30")).toThrow(/contours/);
 });
 it("regenerates geometry after physical placement changes",()=>{
  const first=compileProductionObjectsToStitchIr([base]);
  const second=compileProductionObjectsToStitchIr([{...base,placement:{...base.placement,xMm:70}}]);
  expect(first.length).toBeGreaterThan(0);
  expect(second.length).toBe(first.length);
  expect(first[0]?.kind).toBe("run");
  if(first[0]?.kind==="run"&&second[0]?.kind==="run"){
   expect(second[0].path[0]!.x-first[0].path[0]!.x).toBeCloseTo(20);
  }
 });

});
