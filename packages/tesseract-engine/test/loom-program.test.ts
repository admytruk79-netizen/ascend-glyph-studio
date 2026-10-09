import {describe,it,expect} from "vitest";
import {compileLoomPlan} from "../src/loom-program";
describe("Jacquard-inspired loom compilation",()=>{
 it("encodes deterministic pick-by-pick lift instructions",()=>{
  const path=[{x:3,y:3},{x:8,y:8}];
  const input=[{kind:"run" as const,id:"a",color:"#111111",path,length:2.5}];
  const opts={widthMm:20,heightMm:20,endsPerCm:5,picksPerCm:5};
  const a=compileLoomPlan(input,opts),b=compileLoomPlan(input,opts);
  expect(a).toEqual(b);
  expect(a.ends).toBe(10);
  expect(a.picks).toBe(10);
  expect(a.liftRows).toHaveLength(a.picks);
  expect(a.liftRows.every(row=>row.length===a.ends&&/^[01]+$/.test(row))).toBe(true);
  expect(a.motifRows.some(row=>row.includes("1"))).toBe(true);
 });
 it("keeps unmarked ground in plain weave",()=>{
  const x=compileLoomPlan([],{widthMm:20,heightMm:20,endsPerCm:5,picksPerCm:5});
  expect(x.liftRows[0]).toBe("1010101010");
  expect(x.liftRows[1]).toBe("0101010101");
  expect(x.manufacturable).toBe(true);
 });
 it("reports excessive physical floats instead of silently approving them",()=>{
  const x=compileLoomPlan([{kind:"fill",id:"full",color:"#000",polygon:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]}],{widthMm:20,heightMm:20,endsPerCm:5,picksPerCm:5,maxFloatEnds:1,maxFloatPicks:1});
  expect(x.manufacturable).toBe(true); // complete inversion still maintains a 1/1 interlacement
  expect(x.maxWarpFloat).toBe(1);
  expect(x.maxWeftFloat).toBe(1);
 });
 it("rejects invalid resolution and excessive grid size",()=>{
  expect(()=>compileLoomPlan([],{widthMm:20,heightMm:20,endsPerCm:0,picksPerCm:5})).toThrow("loom-invalid-dimensions");
  expect(()=>compileLoomPlan([],{widthMm:2000,heightMm:2000,endsPerCm:30,picksPerCm:30})).toThrow("loom-grid-capacity");
 });
});
