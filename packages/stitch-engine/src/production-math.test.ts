import test from "node:test";
import assert from "node:assert/strict";
import {estimateProductionMath,empiricalScaleExponent,measureRealizedStitches} from "./production-math.js";
import {recipes} from "./recipes.js";
import {plan,type DesignObject} from "./plan.js";

const recipe=recipes["linen-180-prewashed"]!;

test("fill stitch estimate grows approximately quadratically with uniform scale",()=>{
  const objects:DesignObject[]=[{kind:"fill",id:"f",color:"#000",polygon:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]}];
  const a=estimateProductionMath(objects,recipe,1);
  const b=estimateProductionMath(objects,recipe,2);
  assert.equal(b.objects[0]!.scaleExponent,2);
  assert.ok(b.predictedStitches>=a.predictedStitches*3.95);
  assert.ok(b.predictedStitches<=a.predictedStitches*4.05);
});

test("run and satin stitch estimates grow approximately linearly",()=>{
  const objects:DesignObject[]=[
    {kind:"run",id:"r",color:"#000",path:[{x:0,y:0},{x:40,y:0}]},
    {kind:"satin",id:"s",color:"#111",path:[{x:0,y:10},{x:40,y:10}],width:4}
  ];
  const a=estimateProductionMath(objects,recipe,1);
  const b=estimateProductionMath(objects,recipe,2);
  for(const row of b.objects)assert.equal(row.scaleExponent,1);
  assert.ok(b.predictedStitches>=a.predictedStitches*1.95);
  assert.ok(b.predictedStitches<=a.predictedStitches*2.05);
});

test("thread estimate follows stitch count and realized plan is measurable",()=>{
  const objects:DesignObject[]=[{kind:"run",id:"r",color:"#000",path:[{x:0,y:0},{x:50,y:0}]}];
  const est=estimateProductionMath(objects,recipe,1);
  assert.ok(est.needleThreadM>0);
  assert.ok(est.bobbinThreadM>0);
  const realized=measureRealizedStitches(plan(objects,recipe).commands as any);
  assert.ok(realized.stitchCount>0);
  assert.ok(realized.stitchedPathMm>0);
});

test("empirical exponent recovers linear and quadratic scaling",()=>{
  assert.ok(Math.abs(empiricalScaleExponent(100,1,200,2)-1)<1e-9);
  assert.ok(Math.abs(empiricalScaleExponent(100,1,400,2)-2)<1e-9);
});
