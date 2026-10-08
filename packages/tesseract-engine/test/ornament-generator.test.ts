import {describe,it,expect} from "vitest";
import {generateMotifOrnament} from "../src/ornament-generator";
import type {MotifGrammar} from "../src/motif-grammar";
const part=(id:string,role:"core"|"satellite")=>({id,familyId:id,role,geometry:{silhouette:"M -0.5 -0.5 L 0.5 -0.5 L 0 0.5 Z",aspect:1},sourceIds:["test"],confidence:1,invariants:{preserveSilhouette:true,preserveHoles:true,allowedTransforms:["translate","scale","rotate","mirror"] as ("translate"|"scale"|"rotate"|"mirror")[]},tags:[]});
const source:MotifGrammar={id:"test",parts:[part("center","core"),part("detail","satellite")],instances:[],links:[],repeatCells:[],sourceIds:["test"],confidence:1};
describe("motif ornament generation",()=>{
 it("renders coherent structured motif instances with valid relations",()=>{
  const out=generateMotifOrnament(source,{columns:6,rows:3,cellSize01:.15,mirrorAlternate:true,seed:42,detailLayers:2},960,260);
  expect(out.violations).toEqual([]);
  expect(out.approved).toBe(true);
  expect(out.grammar.instances.length).toBeGreaterThan(100);
  expect(out.grammar.links.length).toBeGreaterThan(0);
  expect(out.svg).toContain('data-renderer="motif-lego"');
  expect(out.svg).not.toContain('data-relation=');
 });
 it("rejects missing motif vocabulary",()=>{
  const out=generateMotifOrnament({...source,parts:[]},{columns:2,rows:2,cellSize01:.5,mirrorAlternate:false,seed:1});
  expect(out.approved).toBe(false);
  expect(out.svg).toBe("");
 });
});
