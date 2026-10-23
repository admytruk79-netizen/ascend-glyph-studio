import{describe,it,expect}from"vitest";
import{generatePatterns}from"../src/pattern-generator";

describe("Tesseract semantic topology budget",()=>{
 it("does not turn corpus evidence into drawable nodes",()=>{
  const corpusSignals=Array.from({length:96},(_,i)=>({id:"evidence-"+i,weight:.7}));
  const out=generatePatterns({
   seed:"semantic-budget-regression",
   concepts:["ancestry","protection","ascent"],
   mode:"sleeve",
   complexity:.7,
   variations:4,
   population:8,
   generations:1,
   corpusSignals
  });
  expect(out.length).toBeGreaterThan(0);
  for(const p of out){
   // Structural topology remains bounded; independently digitizable rhythmic
   // copies are physical placements, not new semantic nodes or corpus glyphs.
   const originals=(p.productionObjects??[]).filter(o=>!o.id.includes(":rhythm:"));
   const repeats=(p.productionObjects??[]).filter(o=>o.id.includes(":rhythm:"));
   expect(originals.length).toBeGreaterThanOrEqual(3);
   expect(originals.length).toBeLessThanOrEqual(12);
   expect((p.productionObjects??[]).length).toBeLessThanOrEqual(48);
   for(const repeat of repeats){
    const parentId=repeat.id.split(":rhythm:")[0]!;
    const parent=originals.find(o=>o.id===parentId);
    expect(parent).toBeDefined();
    expect(repeat.geometryRef).toBe(parent?.geometryRef);
   }
   expect(p.svg).not.toContain("evidence-95");
  }
 });
});
