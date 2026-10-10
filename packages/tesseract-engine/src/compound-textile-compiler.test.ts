import {describe,it,expect} from "vitest";
import {compoundMotifStitchIr,validateCompoundStitchIr} from "./compound-stitch-ir";
import {compoundIrSvg,compoundColourChart} from "./compound-textile-compiler";
describe("compound textile manufacturing intermediate representation",()=>{
 for(const kind of ["branching-garden","interlaced-rosette","stepped-medallion"] as const){
  it("creates bounded shared geometry for "+kind,()=>{
   const objects=compoundMotifStitchIr({id:kind,kind,xMm:150,yMm:150,radiusMm:62});
   const check=validateCompoundStitchIr(objects,300,300);
   expect(check.valid,check.errors.join("; ")).toBe(true);
   expect(objects.length).toBeGreaterThan(10);
   const svg=compoundIrSvg(objects,300,300);
   expect(svg).toContain("<svg");
   expect(svg).toContain("data-object=");
   const chart=compoundColourChart(objects,300,300,32,32);
   expect(chart.grid).toHaveLength(32);
   expect(chart.grid.every(row=>row.length===32)).toBe(true);
   expect(chart.grid.flat().some(cell=>cell!==0)).toBe(true);
  });
 }
 it("rejects out-of-bounds geometry",()=>{
  const objects=compoundMotifStitchIr({id:"bad",kind:"branching-garden",xMm:0,yMm:0,radiusMm:62});
  expect(validateCompoundStitchIr(objects,300,300).valid).toBe(false);
 });
});
