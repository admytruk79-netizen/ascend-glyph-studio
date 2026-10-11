import {describe,it,expect} from "vitest";
import {generatePatterns} from "../src/pattern-generator";

describe("pattern generator medium constraints",()=>{
 it("adapts crossing candidates into supported leather designs",()=>{
  const patterns=generatePatterns({seed:"evaluation:western-leather:0",concepts:["journey","freedom","return"],mode:"band",medium:"leather-tooling",cultureIds:["western-craft","britain"],complexity:.7,variations:10,population:32,generations:4});
  expect(patterns).toHaveLength(10);
  for(const pattern of patterns){
   expect(pattern.productionObjects!.length).toBeGreaterThan(0);
   expect(pattern.stitchObjects!.length).toBeGreaterThan(0);
   expect(pattern.productionObjects!.some(o=>o.form==="crossing")).toBe(false);
  }
 });
});
