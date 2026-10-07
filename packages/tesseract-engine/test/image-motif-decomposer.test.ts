import {describe,expect,it} from "vitest";
import {detectedMotifsToGrammar} from "../src/image-motif-decomposer";
import {buildMotifHierarchy,validateMotifGrammar} from "../src/motif-grammar";
describe("image motif decomposition bridge",()=>{
 it("clusters many detected instances into reusable motif families and hierarchy",()=>{
  const motifs=Array.from({length:512},(_,i)=>({id:"m"+i,familyId:"family-"+(i%37),role:"core" as const,silhouette:"M0 0L10 0L5 10Z",aspect:1,x01:(i%32)/31,y01:Math.floor(i/32)/15,scale:1,rotationDeg:(i%4)*90,mirrorX:i%2===1,layer:i%3,confidence:.9}));
  const grammar=detectedMotifsToGrammar({imageId:"reference-512",sourceRef:"corpus:test",motifs,relations:[],confidence:.9});
  expect(grammar.parts).toHaveLength(37);
  expect(grammar.instances).toHaveLength(512);
  expect(validateMotifGrammar(grammar)).toEqual([]);
  const hierarchy=buildMotifHierarchy(grammar,8);
  expect(hierarchy.instanceCount).toBe(512);
  expect(hierarchy.nodes.find(n=>n.id===hierarchy.rootId)?.instanceIds).toHaveLength(512);
 });
});
