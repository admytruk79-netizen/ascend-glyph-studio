import {describe,it,expect} from "vitest";
import {sampleSvgPath} from "./production-stitch-ir";

describe("source geometry safety",()=>{
 it("samples valid non-square and offset-origin source paths without changing coordinates",()=>{
  expect(sampleSvgPath("M 20 30 L 220 30 L 220 110")).toEqual([{x:20,y:30},{x:220,y:30},{x:220,y:110}]);
 });
 it("rejects unsupported arcs rather than inventing stitches",()=>{
  expect(()=>sampleSvgPath("M 0 0 A 20 20 0 0 1 30 30")).toThrow(/unsupported/);
 });
 it("rejects incomplete coordinates",()=>{
  expect(()=>sampleSvgPath("M 0 0 L 20")).toThrow(/incomplete/);
 });
 it("rejects compound contours pending explicit segmentation",()=>{
  expect(()=>sampleSvgPath("M0 0 L10 0 M20 20 L30 20")).toThrow(/multiple SVG contours/);
 });
});
