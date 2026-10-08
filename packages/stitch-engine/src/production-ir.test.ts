import test from "node:test";
import assert from "node:assert/strict";
import {compileProductionIr} from "./production-ir.js";
import {recipes} from "./recipes.js";

test("neutral production IR compiles to a real stitch plan and math report",()=>{
  const recipe=recipes["linen-180-prewashed"]!;
  const out=compileProductionIr([
    {kind:"run",id:"axis",color:"#111111",path:[{x:10,y:10},{x:10,y:70}],length:2.5},
    {kind:"satin",id:"seed",color:"#111111",path:[{x:30,y:20},{x:50,y:20}],width:2.2,spacing:.4}
  ],recipe,{hoop:{name:"border-360x100",width:360,height:100},maxStitches:120000,maxMinutes:120});
  assert.ok(out.plan.commands.length>0);
  assert.ok(out.realized.stitchCount>0);
  assert.ok(out.math.predictedStitches>0);
  assert.equal(out.gate.checks.some(x=>x.id==="hoop-fit"&&x.pass),true);
  assert.equal(out.gate.release,false); // reference recipe remains prototype until a sew-out validates it
});
