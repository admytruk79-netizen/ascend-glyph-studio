import {describe,expect,it} from "vitest";
import {compileProductionObjectsToStitchIr,sampleSvgPath,transformPrimitivePoints} from "../src/production-stitch-ir";
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
 it("honors non-100-unit source viewBoxes while preserving proportions",()=>{
  const transformed=transformPrimitivePoints([{x:10,y:20},{x:210,y:120}],{
   ...base,physical:{...base.physical,widthMm:60,heightMm:20},
   placement:{...base.placement,xMm:100,yMm:200}
  },"10 20 200 100");
  expect(transformed[0]!.x).toBeCloseTo(80);
  expect(transformed[0]!.y).toBeCloseTo(190);
  expect(transformed[1]!.x).toBeCloseTo(120);
  expect(transformed[1]!.y).toBeCloseTo(210);
 });
 it("fails closed on invalid viewBoxes and nonfinite placement",()=>{
  expect(()=>transformPrimitivePoints([{x:0,y:0}],base,"0 0 0 100")).toThrow(/viewBox/);
  expect(()=>transformPrimitivePoints([{x:0,y:0}],{...base,placement:{...base.placement,xMm:NaN}},"0 0 100 100")).toThrow(/placement/);
 });
});
