import{describe,it,expect}from"vitest";
import{genomeFromTopology}from"../src/genome";
import{projectSemanticGeometry}from"../src/semantic-projector";

describe("semantic projector source geometry",()=>{
 it("renders ASCEND source primitives instead of generic fallback geometry",()=>{
  const t={nodes:[
   {id:"s0",conceptId:"origin",form:"seed",scale:1},
   {id:"s1",conceptId:"return",form:"orbit",scale:2},
   {id:"s2",conceptId:"lineage",form:"branch",scale:2},
   {id:"s3",conceptId:"spirit",form:"radial-emission",scale:2}
  ],edges:[
   {from:"s0",to:"s1",relation:"return",weight:1},
   {from:"s1",to:"s2",relation:"branch",weight:.8},
   {from:"s2",to:"s3",relation:"radiate",weight:.9}
  ]};
  const p=projectSemanticGeometry(genomeFromTopology("source-dna",t),800,240);
  expect(p.svg).toContain('data-primitive="seed"');
  expect(p.svg).toContain('data-primitive="orbit"');
  expect(p.svg).toContain('data-primitive="branch"');
  expect(p.svg).toContain('data-primitive="radial-emission"');
  expect(p.svg).toContain('data-source-status="source-derived-provisional"');
  expect(p.svg).toContain('data-source-path="0"');
 });
});
