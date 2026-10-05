import{describe,it,expect}from"vitest";
import{generatePatterns}from"../src/pattern-generator";

describe("pattern generator color projection",()=>{
 it("applies accents to distinct paths rather than repeatedly rewriting the first path",()=>{
  const [p]=generatePatterns({seed:"accent-regression",concepts:["ancestry","freedom","protection"],paletteId:"underdog-heritage",mode:"band",complexity:.1,variations:4,width:640,height:180});
  expect(p).toBeTruthy();
  const svg=p!.svg;
  const accents=[...svg.matchAll(/data-accent="(\d+)"/g)].map(m=>m[1]);
  expect(accents.length).toBeGreaterThan(1);
  expect(new Set(accents).size).toBe(accents.length);
 });
});
