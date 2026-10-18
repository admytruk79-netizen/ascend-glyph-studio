import {describe,it,expect} from "vitest";
import {splitWrappedQuadratic} from "../src/semantic-projector";

describe("seam curve splitting",()=>{
 it("does not retrace the continuation",()=>{
  const parts=splitWrappedQuadratic({x:10,y:40},{x:190,y:80},200,12);
  expect(parts).toHaveLength(2);
  expect(parts[0]!.to.x).toBeCloseTo(0);
  expect(parts[1]!.from.x).toBeCloseTo(200);
  expect(parts[1]!.from.x).not.toBe(parts[1]!.to.x);
 });
 it("keeps flat panels unwrapped",()=>{
  const parts=splitWrappedQuadratic({x:10,y:40},{x:190,y:80},0,12);
  expect(parts).toHaveLength(1);
  expect(parts[0]!.to.x).toBe(190);
 });
 it("handles the opposite seam direction",()=>{
  const parts=splitWrappedQuadratic({x:190,y:40},{x:10,y:80},200,-9);
  expect(parts).toHaveLength(2);
  expect(parts[0]!.to.x).toBeCloseTo(200);
  expect(parts[1]!.from.x).toBeCloseTo(0);
  expect(parts[0]!.to.y).toBeCloseTo(parts[1]!.from.y);
 });
});
