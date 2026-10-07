import {describe,expect,it} from "vitest";
import {reconstructionTarget,critiqueReconstruction} from "../src/reconstruction-critic";
import type {ImageObservation} from "../src/image-corpus";

const obs=(id:string,features:ImageObservation["features"]):ImageObservation=>({id,sourceRef:id,class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",features,notes:[],provenance:"test"});
describe("reconstruction critic",()=>{
 it("builds an evidence-weighted target and accepts a close reconstruction",()=>{
  const target=reconstructionTarget([obs("a",{symmetry:.8,density:.3,voidRatio:.55,periodicity:.7,focalDominance:.5,compositionalDepth:.6}),obs("b",{symmetry:.7,density:.34,voidRatio:.5,periodicity:.65,focalDominance:.55,compositionalDepth:.58})])!;
  expect(target.sourceIds).toEqual(["a","b"]);
  const candidate={...target.vector,repetition:.55,interruption:.35,directionalEntropy:.35,axisStrength:.7};
  expect(critiqueReconstruction(candidate,target).survive).toBe(true);
 });
 it("rejects graph-like low-hierarchy output even when a pipeline renders it",()=>{
  const target=reconstructionTarget([obs("a",{symmetry:.75,density:.3,voidRatio:.55,periodicity:.65,focalDominance:.55,compositionalDepth:.65})])!;
  const bad={...target.vector,directionalEntropy:.95,axisStrength:.08,compositionalDepth:.08,focalDominance:.08,repetition:.9,interruption:.05};
  const r=critiqueReconstruction(bad,target);
  expect(r.survive).toBe(false);
  expect(r.flags).toContain("reconstruction-graph-like-directionality");
  expect(r.flags).toContain("reconstruction-weak-hierarchy");
  expect(r.flags).toContain("reconstruction-mechanical-repeat");
 });
});
