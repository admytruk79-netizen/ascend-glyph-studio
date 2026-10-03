import {describe,it,expect} from "vitest";import {planEmbroidery} from "../src/manufacturing";
const m=(value:number)=>({value,unit:"mm" as const,confidence:"reference-published" as const});
describe("manufacturing projection",()=>{
 it("recognizes tubular wrap compatibility",()=>{
  const p=planEmbroidery({id:"sleeve",kind:"tapered-cylinder",length:m(620),circumferenceStart:m(416.6),circumferenceEnd:m(223.5),seams:[{position:0,kind:"sleeve"}],zones:["sleeve"]},
   {id:"tajima",maker:"Tajima",model:"TMBP2-XC",process:"embroidery",fieldX:m(550),fieldY:m(600),supportsTubular:true,supportsFinishedSleeve:true,sourceId:"tajima"},70);
  expect(p.mode).toBe("single-field");expect(p.reasons).toContain("tubular-wrap-compatible");
 });
 it("rejects an impossible band width",()=>{const p=planEmbroidery({id:"x",kind:"flat",length:m(300),seams:[],zones:[]},{id:"b",maker:"Brother",model:"PR",process:"embroidery",fieldX:m(356),fieldY:m(203),supportsTubular:false,supportsFinishedSleeve:false,sourceId:"b"},400);expect(p.mode).toBe("unsupported")});
});
