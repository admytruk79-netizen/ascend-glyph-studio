import{describe,it,expect}from"vitest";
import{generatePatterns}from"../src/pattern-generator";

describe("pattern generator color projection",()=>{
 it("applies accents to distinct paths rather than repeatedly rewriting the first path",()=>{
  const [p]=generatePatterns({seed:"accent-regression",concepts:["ancestry","freedom","protection"],paletteId:"underdog-heritage",mode:"band",complexity:.1,variations:4,width:640,height:180});
  expect(p).toBeTruthy();
  const svg=p!.conceptSvg!;
  const accents=[...svg.matchAll(/data-accent="(\d+)"/g)].map(m=>m[1]);
  expect(accents.length).toBeGreaterThan(1);
  expect(new Set(accents).size).toBe(accents.length);
 });
});

describe("pattern generator SVG validity",()=>{
 it("keeps self-closing paths closed and never duplicates the stroke attribute when applying accents",()=>{
  const [p]=generatePatterns({seed:"accent-xml",concepts:["ancestry","freedom","protection"],paletteId:"underdog-heritage",mode:"band",complexity:.5,variations:2,width:640,height:180});
  const svg=p!.conceptSvg!;
  // a slash followed by more attributes means the tag was broken open (`d="…"/ data-accent=…>`)
  expect(svg).not.toMatch(/\/\s+[a-z-]+=/);
  for(const m of svg.matchAll(/<path\b[^>]*>/g)){
   const tag=m[0];
   expect((tag.match(/\sstroke="/g)??[]).length).toBeLessThanOrEqual(1);
  }
  // every path is self-closed or explicitly closed
  const open=(svg.match(/<path\b[^>]*[^/]>/g)??[]).length,close=(svg.match(/<\/path>/g)??[]).length;
  expect(open).toBe(close);
 });
});
