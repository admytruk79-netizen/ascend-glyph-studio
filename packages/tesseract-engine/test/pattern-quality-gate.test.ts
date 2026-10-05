import{describe,it,expect}from"vitest";
import{generatePatterns}from"../src/pattern-generator";
describe("pattern quality gate",()=>{
 it("returns only accepted ASCEND-dominant families",()=>{
  const patterns=generatePatterns({seed:"quality-gate",concepts:["ancestry","freedom","protection","return"],mode:"band",complexity:.7,variations:8,width:960,height:220});
  expect(patterns.length).toBeGreaterThan(0);
  expect(patterns.every(p=>p.quality.accepted)).toBe(true);
  expect(patterns.every(p=>p.quality.sourcePrimitiveRatio>=.6)).toBe(true);
  expect(patterns.every(p=>p.aesthetic.total>=.55)).toBe(true);
 });
});
