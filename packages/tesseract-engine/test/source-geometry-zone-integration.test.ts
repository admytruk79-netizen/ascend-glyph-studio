import{describe,it,expect}from"vitest";
import{genomeFromTopology}from"../src/genome";
import{projectSemanticGeometry}from"../src/semantic-projector";
import{generatePatterns}from"../src/pattern-generator";

describe("ASCEND source geometry and garment projection",()=>{
 it("renders source-derived primitives",()=>{
  const t={nodes:[{id:"s0",conceptId:"origin",form:"seed",scale:1},{id:"s1",conceptId:"return",form:"orbit",scale:2},{id:"s2",conceptId:"lineage",form:"branch",scale:3}],edges:[{from:"s0",to:"s1",relation:"return",weight:1},{from:"s1",to:"s2",relation:"branch",weight:.8}]};
  const svg=projectSemanticGeometry(genomeFromTopology("source-dna",t),800,240).svg;
  expect(svg).toContain('data-primitive="seed"');
  expect(svg).toContain('data-primitive="orbit"');
  expect(svg).toContain('data-primitive="branch"');
  expect(svg).toContain('data-source-status="source-derived-provisional"');
 });
 it("uses wrap-aware placement for cuffs but flat placement for fields",()=>{
  const cuff=generatePatterns({seed:"cuff-zone",concepts:["lineage","return"],mode:"cuff",complexity:0,variations:4,width:480,height:120})[0]!;
  const field=generatePatterns({seed:"field-zone",concepts:["lineage","return"],mode:"field",complexity:0,variations:4,width:480,height:240})[0]!;
  expect(cuff.svg).toContain('data-wrap="true"');
  expect(field.svg).toContain('data-wrap="false"');
  expect(cuff.aesthetic.total).toBeGreaterThan(0);
 });
});
