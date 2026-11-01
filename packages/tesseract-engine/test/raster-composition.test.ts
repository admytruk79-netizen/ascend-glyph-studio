import {describe,it,expect} from "vitest";
import {analyzeRaster} from "../src/raster-composition";
function raster(w:number,h:number,ink:(x:number,y:number)=>boolean){
 const rgba=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=ink(x,y)?0:255;rgba.set([v,v,v,255],i);}
 return {width:w,height:h,rgba};
}
describe("raster composition indicators",()=>{
 it("rejects incorrect dimensions",()=>expect(()=>analyzeRaster({width:12,height:12,rgba:new Uint8Array(10)})).toThrow("invalid-raster"));
 it("detects blank field",()=>expect(analyzeRaster(raster(32,32,()=>false)).density).toBe(0));
 it("measures vertical mirror symmetry",()=>{const m=analyzeRaster(raster(32,32,(x,y)=>y>4&&y<25&&(x===4||x===27)));expect(m.symmetry).toBe(1);});
 it("detects structured ink coverage",()=>{const m=analyzeRaster(raster(32,32,(x,y)=>(x+y)%4===0));expect(m.density).toBeCloseTo(.25);expect(m.voidRatio).toBeCloseTo(.75);});
});
