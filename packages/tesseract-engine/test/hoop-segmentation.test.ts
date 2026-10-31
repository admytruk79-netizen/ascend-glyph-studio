import {describe,it,expect} from "vitest";
import {planHoopSegmentationCandidates} from "../src/hoop-segmentation";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";
import {MACHINE_TEMPLATES} from "../src/machine-template";
import type {StitchIrObject} from "../src/production-stitch-ir";

const machine=MACHINE_TEMPLATES["brother-pr1055x-reference"]!;
const line=(id:string,x:number,y:number,dx=10,dy=10):StitchIrObject=>({
 kind:"run",id,color:"#111111",path:[{x,y},{x:x+dx,y:y+dy}]
});
const plan=(objects:StitchIrObject[],maxTiles?:number)=>
 planHoopSegmentationCandidates(objects,{widthMm:700,heightMm:500,machine,maxTiles});

describe("reference-only hoop segmentation candidates",()=>{
 it("groups separated motifs into deterministic bounded tiles without splitting source objects",()=>{
  const a=line("left",10,10),b=line("right",500,300);
  const p=plan([b,a]);
  expect(p.errors).toEqual([]);
  expect(p.status).toBe("reference-only");
  expect(p.tiles).toHaveLength(2);
  expect(p.tiles.flatMap(t=>t.sourceObjectIds)).toEqual(["left","right"]);
  expect(p.tiles.every(t=>t.boundsMm.width<=machine.fieldX.value&&
    t.boundsMm.height<=machine.fieldY.value)).toBe(true);
  expect(p.releaseBlockers).toContain("registration-marks-and-cross-hoop-continuity-unverified");
  expect(plan([a,b]).tiles).toEqual(p.tiles);
 });
 it("keeps nearby source objects together without changing their geometry",()=>{
  const p=plan([line("a",10,10),line("b",60,50)]);
  expect(p.errors).toEqual([]);
  expect(p.tiles).toHaveLength(1);
  expect(p.tiles[0]?.sourceObjectIds).toEqual(["a","b"]);
  expect(p.tiles[0]?.hoopOriginMm).toEqual({x:10,y:10});
 });
 it("rejects a motif that exceeds the field rather than cutting it",()=>{
  const p=plan([line("wide",10,10,400,5)]);
  expect(p.tiles).toEqual([]);
  expect(p.errors).toContain("object-exceeds-machine-field:wide");
 });
 it("fails closed on out-of-envelope, duplicate, and invalid source coordinates",()=>{
  expect(plan([line("outside",690,20,20,2)]).errors).toContain("outside-job-envelope:outside");
  expect(plan([line("x",1,1),line("x",50,50)]).errors).toContain("duplicate-source-id:x");
  expect(plan([line("nan",NaN,1)]).errors).toContain("invalid-path:nan");
 });
 it("enforces bounded candidate count and rejects unverified machine fields",()=>{
  const p=plan([line("a",10,10),line("b",500,300)],1);
  expect(p.errors).toContain("tile-limit-exceeded");
  expect(p.tiles).toEqual([]);
  const bad={...machine,fieldX:{...machine.fieldX,value:0}};
  const invalid=planHoopSegmentationCandidates([line("a",1,1)],{
   widthMm:700,heightMm:500,machine:bad
  });
  expect(invalid.errors).toContain("machine-field-unverified");
 });
 it("exposes candidates but never makes an oversized job valid",()=>{
  const objects=[line("a",10,10),line("b",500,300)];
  const job=planEmbroideryJob(objects,{widthMm:700,heightMm:500,machine});
  expect(job.validation.valid).toBe(false);
  expect(job.validation.errors).toContain("machine-field-exceeded:segmentation-required");
  expect(job.segmentationCandidate?.tiles).toHaveLength(2);
  expect(job.validation.warnings.join(" ")).toMatch(/registration and physical sew-out remain blocked/);
 });
});
