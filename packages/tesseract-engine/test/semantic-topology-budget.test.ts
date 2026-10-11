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
   const nodeCount=p.productionObjects?.length??0;
   expect(nodeCount).toBeGreaterThanOrEqual(3);
   expect(nodeCount).toBeLessThanOrEqual(12);
   expect(p.svg).not.toContain("evidence-95");
  }
 });
});
