import {describe,it,expect} from "vitest";
import {relate} from "../src/relationships";
import type {TesseractInstance} from "../src/types";
const glyph={source:{glyphId:"earth-01",version:"1",assetKey:"x.svg"},recipe:{version:"1",depth:1,bevel:0,curveSegments:8}};
const a:TesseractInstance={id:"a",glyph,position4:[0,0,0,0],rotation:[0,0,0,1],scale:1};
const b:TesseractInstance={id:"b",glyph,position4:[4,0,0,0],rotation:[0,0,0,1],scale:1};
describe("spatial relationships",()=>{
 it("creates deterministic orbit state",()=>expect(relate(a,b,{kind:"orbit",distance:2,phase:0}).position4).toEqual([2,0,0,1]));
 it("bridges without mutating either source instance",()=>{const r=relate(a,b,{kind:"bridge"});expect(r.position4).toEqual([2,0,0,1]);expect(a.position4).toEqual([0,0,0,0]);expect(b.position4).toEqual([4,0,0,0]);});
 it("fails closed for invalid distance",()=>expect(()=>relate(a,b,{kind:"orbit",distance:-1})).toThrow());
});