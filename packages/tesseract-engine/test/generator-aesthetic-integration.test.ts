import{describe,it,expect}from"vitest";
import{blocksFromTopology,scoreTopologyComposition}from"../src/aesthetic-critic";
import{generatePatterns}from"../src/pattern-generator";

describe("generator aesthetic integration",()=>{
 it("adapts topology into critic blocks",()=>{
  const t={nodes:[{id:"a",conceptId:"origin",form:"seed",scale:1},{id:"b",conceptId:"return",form:"orbit",scale:3},{id:"c",conceptId:"absence",form:"void",scale:2}],edges:[{from:"a",to:"b",relation:"return",weight:1},{from:"b",to:"c",relation:"terminate",weight:.8}]};
  const blocks=blocksFromTopology(t);
  expect(blocks).toHaveLength(3);
  expect(blocks.find(b=>b.id==="c")?.sockets.some(s=>s.kind==="void")).toBe(true);
  expect(scoreTopologyComposition(t).total).toBeGreaterThan(0);
 });
 it("returns aesthetic scores and ranks by combined generator score",()=>{
  const patterns=generatePatterns({seed:"critic-rank",concepts:["ancestry","freedom","protection"],mode:"band",complexity:.1,variations:4,width:640,height:180});
  expect(patterns.length).toBeGreaterThan(1);
  expect(patterns.every(p=>p.aesthetic.total>0)).toBe(true);
  for(let i=1;i<patterns.length;i++)expect(patterns[i-1]!.generatorScore).toBeGreaterThanOrEqual(patterns[i]!.generatorScore);
 });
});
