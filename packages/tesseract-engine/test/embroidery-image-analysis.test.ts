import {describe,it,expect} from "vitest";
import {analyzeEmbroideryPixels} from "../src/embroidery-image-analysis";
const frame=(w:number,h:number,paint:(x:number,y:number)=>boolean)=>{
 const rgba=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,v=paint(x,y)?0:255;
  rgba[i]=v;rgba[i+1]=v;rgba[i+2]=v;rgba[i+3]=255;
 }
 return {width:w,height:h,rgba};
};
describe("embroidery image structural analysis",()=>{
 it("finds alternating ink bands and records conservative warnings",()=>{
  const result=analyzeEmbroideryPixels(frame(24,24,(_x,y)=>y>=4&&y<8||y>=14&&y<18),[255,255,255]);
  expect(result.horizontalBands).toBe(2);
  expect(result.foregroundRatio).toBeCloseTo(8/24);
  expect(result.operations).toContain("alternate");
  expect(result.warnings.length).toBeGreaterThan(0);
 });
 it("fails closed on invalid images and settings",()=>{
  expect(()=>analyzeEmbroideryPixels({width:10,height:10,rgba:new Uint8Array(2)},[255,255,255])).toThrow();
  expect(()=>analyzeEmbroideryPixels(frame(10,10,()=>false),[255,255,255],0)).toThrow();
 });
 it("does not invent repeats from an entirely blank field",()=>{
  const result=analyzeEmbroideryPixels(frame(16,16,()=>false),[255,255,255]);
  expect(result.operations).toEqual([]);
  expect(result.horizontalRepeatLagPx).toBeNull();
 });
});
