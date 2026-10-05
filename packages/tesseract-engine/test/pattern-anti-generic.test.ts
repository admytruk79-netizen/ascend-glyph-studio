import{describe,it,expect}from"vitest";
import{qualityGate,scoreTopologyComposition}from"../src/aesthetic-critic";
import{generatePatterns}from"../src/pattern-generator";

describe("anti-generic pattern selection",()=>{
 it("flags repetitive single-form ornament as generic",()=>{
  const t={nodes:Array.from({length:8},(_,i)=>({id:"n"+i,conceptId:"x",form:"opposition",scale:1})),edges:Array.from({length:7},(_,i)=>({from:"n"+i,to:"n"+(i+1),relation:"repeat",weight:1}))};
  const q=qualityGate(t,scoreTopologyComposition(t),"field");
  expect(q.accepted).toBe(false);
  expect(q.genericRisk).toBeGreaterThan(.58);
  expect(q.reasons).toContain("generic-ornament-risk");
 });
 it("returns accepted families below the generic-risk ceiling",()=>{
  const patterns=generatePatterns({seed:"anti-generic",concepts:["ancestry","freedom","protection","return","ascent"],mode:"field",complexity:.75,variations:8,width:1000,height:700});
  expect(patterns.length).toBeGreaterThan(0);
  expect(patterns.every(p=>p.quality.accepted)).toBe(true);
  expect(patterns.every(p=>p.quality.genericRisk<=.58)).toBe(true);
 });
});
