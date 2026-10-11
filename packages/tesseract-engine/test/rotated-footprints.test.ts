import {describe,it,expect} from "vitest";
import {insideZone,nestedRotated,overlapsRotated} from "../src/rotated-footprints";
describe("rotated production envelopes",()=>{
 const a={x:30,y:30,width:40,height:8,angleDeg:0};
 it("does not reject narrow non-overlapping objects as bounding circles do",()=>{
  expect(overlapsRotated(a,{x:30,y:42,width:40,height:8,angleDeg:0},1)).toBe(false);
 });
 it("detects rotation-induced collisions",()=>{
  expect(overlapsRotated(a,{x:30,y:42,width:40,height:8,angleDeg:90},1)).toBe(true);
 });
 it("validates nested rotated child geometry",()=>{
  const parent={x:50,y:50,width:80,height:60,angleDeg:30};
  expect(nestedRotated(parent,{x:50,y:50,width:12,height:10,angleDeg:45},2)).toBe(true);
  expect(nestedRotated(parent,{x:85,y:85,width:30,height:30,angleDeg:45},2)).toBe(false);
 });
 it("handles periodic seam-adjacent placements",()=>{
  expect(overlapsRotated({x:3,y:30,width:10,height:10,angleDeg:0},{x:97,y:30,width:10,height:10,angleDeg:0},1,100)).toBe(true);
 });
 it("rejects a rotated shape outside a production zone",()=>{
  expect(insideZone({x:10,y:10,width:40,height:8,angleDeg:45},100,100,1)).toBe(false);
 });
});
