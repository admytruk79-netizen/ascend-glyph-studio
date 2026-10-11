import {describe,it,expect} from "vitest";
import {liftPlanToShaftDraft} from "../src/historical-shaft-draft";
import {optimizeStitchTravel} from "../src/stitch-travel-optimizer";
describe("historical and modern manufacturing compilers",()=>{
 it("roundtrips a four-shaft draft exactly",()=>{
  const liftRows=["1010","0101","1100","0011"];
  const plan=liftPlanToShaftDraft({ends:4,picks:4,liftRows},4,4);
  expect(plan.exact).toBe(true);
  expect(plan.drawdown).toEqual(liftRows);
  expect(plan.shafts).toBe(4);
 });
 it("reports shafts exceeding available historical loom hardware",()=>{
  const liftRows=["1000","0100","0010","0001"];
  const plan=liftPlanToShaftDraft({ends:4,picks:4,liftRows},2,4);
  expect(plan.exact).toBe(false);
  expect(plan.errors).toContain("shaft-limit-exceeded");
 });
 it("does not change run geometry or increase recorded travel",()=>{
  const paths=[
   {kind:"run" as const,id:"a",color:"#000000",path:[{x:10,y:0},{x:11,y:0}]},
   {kind:"run" as const,id:"b",color:"#000000",path:[{x:30,y:0},{x:31,y:0}]},
   {kind:"run" as const,id:"c",color:"#000000",path:[{x:12,y:0},{x:13,y:0}]}
  ];
  const result=optimizeStitchTravel(paths);
  expect(result.after.travelMm).toBeLessThanOrEqual(result.before.travelMm);
  expect(result.objects.map(o=>o.id).sort()).toEqual(["a","b","c"]);
  for(const p of paths){
   const o=result.objects.find(x=>x.id===p.id)!;
   if(o.kind!=="run")throw new Error("unexpected route type");
   const original=p.path.map(x=>JSON.stringify(x)).sort();
   expect(o.path.map(x=>JSON.stringify(x)).sort()).toEqual(original);
  }
 });
});
