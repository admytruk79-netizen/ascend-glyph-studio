import {describe,expect,it} from "vitest";
import {solveKaleidoscopicAssembly} from "../src/kaleidoscopic-assembly";
import type {MotifGrammar} from "../src/motif-grammar";
const g={id:"k",parts:[],instances:[],links:[],repeatCells:[],sourceIds:["test"],confidence:1} satisfies MotifGrammar;
describe("kaleidoscopic assembly",()=>{
 it("accepts transformed motifs only when their joins close coherently",()=>{
  const ports=[{instanceId:"a",name:"out",x01:.5,y01:.5,angleDeg:0,kind:"exit" as const},{instanceId:"b",name:"in",x01:.505,y01:.5,angleDeg:0,kind:"entry" as const}];
  const r=solveKaleidoscopicAssembly(g,ports,[{a:"a:out",b:"b:in",relation:"attach",maxGap:.02,angleToleranceDeg:8}]);
  expect(r.valid).toBe(true);expect(r.violations).toEqual([]);
 });
 it("rejects arbitrary kaleidoscope placement that leaves gaps or bad angles",()=>{
  const ports=[{instanceId:"a",name:"out",x01:.1,y01:.1,angleDeg:0,kind:"exit" as const},{instanceId:"b",name:"in",x01:.8,y01:.8,angleDeg:91,kind:"entry" as const}];
  const r=solveKaleidoscopicAssembly(g,ports,[{a:"a:out",b:"b:in",relation:"attach",maxGap:.03,angleToleranceDeg:10}]);
  expect(r.valid).toBe(false);expect(r.violations).toContain("open-join:a:out:b:in");expect(r.violations).toContain("misaligned-join:a:out:b:in");
 });
});
