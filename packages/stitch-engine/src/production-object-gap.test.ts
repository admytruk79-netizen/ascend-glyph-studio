import test from "node:test";
import assert from "node:assert/strict";
import {plan} from "./plan.js";
import {runGate} from "./gate.js";
import {recipes} from "./recipes.js";

const linen=recipes["linen-180-prewashed"]!;

test("minimum gap is measured between production objects, not paths of one glyph",()=>{
 const objects=[
  {kind:"run" as const,id:"glyph-a:p0",color:"#111",path:[{x:0,y:0},{x:20,y:0}]},
  {kind:"run" as const,id:"glyph-a:p1",color:"#111",path:[{x:0,y:.2},{x:20,y:.2}]},
  {kind:"run" as const,id:"glyph-b:p0",color:"#111",path:[{x:0,y:5},{x:20,y:5}]}
 ];
 const p=plan(objects,linen);
 const g=runGate(objects,p.commands,linen,{hoop:{name:"100",width:100,height:100}},1);
 assert.equal(g.checks.find(x=>x.id==="min-gap")?.pass,true);
});
