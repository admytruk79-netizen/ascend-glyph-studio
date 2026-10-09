import {test} from "vitest";
import assert from "node:assert/strict";
import {collapseAssemblyRoles,applyAssemblyConstraintCollapse} from "./constraint-collapse.js";
import type {LearnedAssemblyPrior} from "./learned-assembly-prior.js";

const prior:LearnedAssemblyPrior={
 hierarchyStrength:.7,adjacencyDensity:.6,axialBias:.7,diagonalBias:.3,
 repeatRegularity:.8,repeatGap:.14,scaleRatioMedian:1,scaleRatioSpread:.3,
 evidencePairs:100,evidenceBricks:5,sourceModel:"test",
 roleWeights:{hero:.2,companion:.35,filler:.25,frame:.1,connector:.1},
 adjacency:{
  frame:{companion:1},
  companion:{frame:.2,hero:.5,filler:.3},
  hero:{companion:1},
  filler:{companion:1},
  connector:{companion:1}
 }
};

test("constraint collapse is deterministic and respects fixed hero/frame roles",()=>{
 const a=collapseAssemblyRoles(5,"seed",prior,{0:"frame",2:"hero",4:"frame"});
 const b=collapseAssemblyRoles(5,"seed",prior,{0:"frame",2:"hero",4:"frame"});
 assert.deepEqual(a,b);
 assert.equal(a[0],"frame");
 assert.equal(a[2],"hero");
 assert.equal(a[4],"frame");
});

// Omitted learned pairs have a fallback weight. Encode hard constraints explicitly.
const roles = ["hero","companion","filler","frame","connector"] as const;
const strictPrior:LearnedAssemblyPrior = {...prior, adjacency:Object.fromEntries(
 roles.map(a=>[a,Object.fromEntries(roles.map(b=>[b,prior.adjacency?.[a]?.[b] ?? prior.adjacency?.[b]?.[a] ?? 0]))])
)};

test("constraint collapse propagates explicit adjacency restrictions",()=>{
 const roles=collapseAssemblyRoles(3,"backtrack",strictPrior,{1:"hero"});
 assert.equal(roles[1],"hero");
 assert.equal(roles[0],"companion");
 assert.equal(roles[2],"companion");
});

test("ASCEND topology keeps semantics while receiving assembly roles",()=>{
 const t={nodes:[
  {id:"a",conceptId:"origin",form:"seed",scale:1},
  {id:"b",conceptId:"protection",form:"axis",scale:2},
  {id:"c",conceptId:"ascent",form:"axis",scale:1},
  {id:"d",conceptId:"return",form:"orbit",scale:2}
 ],edges:[
  {from:"a",to:"b",relation:"flow",weight:1},
  {from:"b",to:"c",relation:"ascend",weight:1},
  {from:"c",to:"d",relation:"return",weight:1}
 ]};
 const out=applyAssemblyConstraintCollapse(t,"ascend",prior);
 assert.deepEqual(out.nodes.map(n=>n.conceptId),t.nodes.map(n=>n.conceptId));
 assert.equal(out.nodes[0]!.assemblyRole,"frame");
 assert.equal(out.nodes[2]!.assemblyRole,"hero");
 assert.equal(out.nodes[3]!.assemblyRole,"frame");
});


test("constraint collapse rejects contradictory explicit restrictions",()=>{
 assert.throws(()=>collapseAssemblyRoles(2,"contradiction",strictPrior,{0:"hero",1:"filler"}),/no valid initial solution/);
});

test("constraint collapse preserves fallback for unobserved learned pairs",()=>{
 assert.deepEqual(collapseAssemblyRoles(2,"fallback",prior,{0:"hero",1:"filler"}),["hero","filler"]);
});
