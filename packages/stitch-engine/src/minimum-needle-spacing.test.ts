import test from "node:test";
import assert from "node:assert/strict";
import {plan} from "./plan.js";
import {runGate} from "./gate.js";
import {recipes} from "./recipes.js";

test("planner removes illegal sub-millimetre penetrations from generated geometry",()=>{
 const r=recipes["linen-180-prewashed"]!;
 const objects=[{kind:"run" as const,id:"detail",color:"#111",path:[
  {x:0,y:0},{x:.18,y:.12},{x:.42,y:.1},{x:2.4,y:0},{x:5,y:0}
 ],length:2.5}];
 const p=plan(objects,r);
 const g=runGate(objects,p.commands,r,{hoop:{name:"100",width:100,height:100}},1);
 assert.equal(g.checks.find(x=>x.id==="min-stitch")?.pass,true);
});
