import {describe,it,expect} from "vitest";
import {stitchIrToSvg} from "../src/canonical-preview";
describe("canonical manufacturing preview",()=>{
 it("renders the exact stitch-IR paths without synthesizing new geometry",()=>{
  const objects=[
   {kind:"run" as const,id:"glyph:1",color:"#123456",path:[{x:3,y:5},{x:7,y:11}],length:2.5},
   {kind:"satin" as const,id:"glyph:2",color:"#abcdef",path:[{x:8,y:5},{x:12,y:11}],width:2,spacing:.4}
  ];
  const svg=stitchIrToSvg(objects,100,50);
  expect(svg).toContain('data-geometry-source="stitch-ir"');
  expect(svg).toContain('d="M3.000 5.000 L7.000 11.000"');
  expect(svg).toContain('d="M8.000 5.000 L12.000 11.000"');
  expect((svg.match(/data-stitch-id=/g)??[])).toHaveLength(objects.length);
  expect(svg).not.toContain("data-rich-layer");
 });
 it("fails closed for nonfinite production coordinates",()=>{
  expect(()=>stitchIrToSvg([{kind:"run",id:"x",color:"#000",path:[{x:1,y:2},{x:NaN,y:3}]}],100,50)).toThrow("invalid canonical stitch path");
 });
});
