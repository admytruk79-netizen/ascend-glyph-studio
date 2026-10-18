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
});
