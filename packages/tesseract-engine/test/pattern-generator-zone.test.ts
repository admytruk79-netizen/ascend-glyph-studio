import{describe,it,expect}from"vitest";
import{generatePatterns}from"../src/pattern-generator";

describe("pattern generator garment projection",()=>{
 it("uses wrap-aware geometry for cuff patterns and flat geometry for fields",()=>{
  const cuff=generatePatterns({seed:"zone-cuff",concepts:["lineage","return"],mode:"cuff",complexity:0,variations:4,width:480,height:120})[0];
  const field=generatePatterns({seed:"zone-field",concepts:["lineage","return"],mode:"field",complexity:0,variations:4,width:480,height:240})[0];
  expect(cuff?.conceptSvg).toContain('data-wrap="true"');
  expect(cuff?.svg).toContain('data-geometry-source="stitch-ir"');
  expect(field?.conceptSvg).toContain('data-wrap="false"');
  expect(field?.svg).toContain('data-geometry-source="stitch-ir"');
 });
});
