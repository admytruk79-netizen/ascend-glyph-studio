import {describe,it,expect} from "vitest";
import {project4Dto3D} from "../src/project4d";
describe("4D projection",()=>{
 it("is deterministic and preserves xyz in orthographic-w",()=>expect(project4Dto3D([1,2,3,9],{kind:"orthographic-w"})).toEqual([1,2,3]));
 it("projects relational depth without mutating input",()=>{
  const p=[1,2,3,1] as const;
  expect(project4Dto3D(p,{kind:"perspective-w",wDistance:4})).toEqual([4/3,8/3,4]);
  expect(p).toEqual([1,2,3,1]);
 });
 it("fails closed at a projection singularity",()=>expect(()=>project4Dto3D([1,2,3,4],{kind:"perspective-w",wDistance:4})).toThrow());
});
