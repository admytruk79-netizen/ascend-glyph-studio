import {describe,expect,it} from "vitest";
import {buildMotifHierarchy,mutateMotifGrammar,validateMotifGrammar,type MotifGrammar} from "../src/motif-grammar";

const g:MotifGrammar={id:"embroidered-band",sourceIds:["ref-1"],confidence:.9,
 parts:[{id:"rosette",familyId:"rosette-family",role:"core",geometry:{silhouette:"M0 5 L5 0 L10 5 L5 10 Z",aspect:1},sourceIds:["ref-1"],confidence:.95,invariants:{preserveSilhouette:true,preserveHoles:true,allowedTransforms:["translate","scale","rotate","mirror"]},tags:["floral","diamond"]}],
 instances:[{id:"m1",partId:"rosette",x01:.25,y01:.5,scale:1,rotationDeg:0,mirrorX:false,layer:0},{id:"m2",partId:"rosette",x01:.75,y01:.5,scale:1,rotationDeg:0,mirrorX:true,layer:0}],
 links:[{from:"m1",to:"m2",relation:"mirror",weight:1}],
 repeatCells:[{id:"cell",instanceIds:["m1","m2"],axis:"horizontal",period01:.5,mirrorAlternate:true}]
};
describe("motif Lego grammar",()=>{
 it("validates semantic motif parts rather than primitive strokes",()=>expect(validateMotifGrammar(g)).toEqual([]));
 it("mutates arrangement without changing motif geometry",()=>{
  const m=mutateMotifGrammar(g,17);
  expect(m.parts).toEqual(g.parts);
  expect(m.instances).not.toEqual(g.instances);
  expect(m.parts[0]!.geometry.silhouette).toBe(g.parts[0]!.geometry.silhouette);
 });
 it("supports hundreds of motif instances with recursive hierarchy and no fixed ceiling",()=>{
  const many:MotifGrammar={...g,instances:Array.from({length:384},(_,i)=>({id:"m"+i,partId:"rosette",x01:(i%32)/31,y01:Math.floor(i/32)/11,scale:1,rotationDeg:0,mirrorX:i%2===1,layer:0})),links:[],repeatCells:[]};
  const h=buildMotifHierarchy(many,8);
  expect(h.instanceCount).toBe(384);
  expect(h.maxDepth).toBeGreaterThan(2);
  expect(h.nodes.find(n=>n.id===h.rootId)?.instanceIds).toHaveLength(384);
  expect(h.nodes.some(n=>n.kind==="compound-motif")).toBe(true);
 });
});
