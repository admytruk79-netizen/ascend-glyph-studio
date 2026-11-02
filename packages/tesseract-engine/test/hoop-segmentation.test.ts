import {describe,it,expect} from "vitest";
import {planHoopSegmentationCandidates} from "../src/hoop-segmentation";
import {auditHoopRegistrationGeometry} from "../src/hoop-registration-audit";
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
 it("reports disconnected reference fields without implying registration approval",()=>{
  const p=plan([line("a",10,10),line("b",500,300)]);
  const audit=p.registrationGeometryAudit!;
  expect(audit.status).toBe("reference-only");
  expect(audit.connectedByFieldOverlap).toBe(false);
  expect(audit.fieldOverlapLinks).toEqual([]);
  expect(audit.unreachableFromFirstTileIds).toEqual(["hoop-002"]);
  expect(audit.warnings).toContain("no-continuous-shared-field-corridor-external-registration-datum-required");
  expect(p.releaseBlockers).toContain("registration-marks-and-cross-hoop-continuity-unverified");
 });
 it("reports a positive shared field corridor but still blocks physical registration",()=>{
  const p=plan([line("a",10,10),line("b",360,10)]);
  expect(p.tiles).toHaveLength(2);
  const audit=p.registrationGeometryAudit!;
  expect(audit.connectedByFieldOverlap).toBe(true);
  expect(audit.unreachableFromFirstTileIds).toEqual([]);
  expect(audit.fieldOverlapLinks).toEqual([{
   fromTileId:"hoop-001",toTileId:"hoop-002",
   overlapMm:{x:360,y:10,width:6,height:203}
  }]);
  expect(audit.warnings).toContain("registration-marks-fixturing-and-seam-continuity-unverified");
  expect(p.releaseBlockers.length).toBeGreaterThan(0);
 });
 it("does not invent a registration audit when input geometry is rejected",()=>{
  const p=plan([line("wide",10,10,400,5)]);
  expect(p.registrationGeometryAudit).toBeUndefined();
 });

 it("clips shared-field corridors to the rectangular job envelope",()=>{
  const tiles=[
   {id:"a",sourceObjectIds:["a"],boundsMm:{x:0,y:90,width:10,height:10},hoopOriginMm:{x:0,y:90}},
   {id:"b",sourceObjectIds:["b"],boundsMm:{x:80,y:90,width:10,height:10},hoopOriginMm:{x:80,y:90}}
  ];
  const audit=auditHoopRegistrationGeometry(tiles,{width:100,height:100},{width:100,height:100});
  expect(audit.fieldOverlapLinks).toEqual([{
   fromTileId:"a",toTileId:"b",overlapMm:{x:80,y:90,width:20,height:10}
  }]);
  expect(audit.connectedByFieldOverlap).toBe(true);
  expect(audit.jobEnvelopeMm).toEqual({width:100,height:100});
  expect(audit.warnings).toContain("rectangular-job-envelope-is-not-a-verified-fabric-or-seam-map");
 });
 it("does not count overlap wholly outside the reference panel or approve empty tiles",()=>{
  const tiles=[
   {id:"a",sourceObjectIds:["a"],boundsMm:{x:0,y:120,width:10,height:10},hoopOriginMm:{x:0,y:120}},
   {id:"b",sourceObjectIds:["b"],boundsMm:{x:80,y:120,width:10,height:10},hoopOriginMm:{x:80,y:120}}
  ];
  const audit=auditHoopRegistrationGeometry(tiles,{width:100,height:100},{width:100,height:100});
  expect(audit.fieldOverlapLinks).toEqual([]);
  expect(audit.connectedByFieldOverlap).toBe(false);
  expect(audit.unreachableFromFirstTileIds).toEqual(["b"]);
  const empty=auditHoopRegistrationGeometry([],{width:100,height:100},{width:100,height:100});
  expect(empty.connectedByFieldOverlap).toBe(false);
  expect(empty.warnings).toContain("no-hoop-tiles");
 });
 it("reference complete-shirt panel proxy preserves all source objects and blocks release",()=>{
  const motifs=[line("front-left",30,30,30,20),line("front-right",440,30,30,20),
   line("back",30,300,30,20),line("sleeve",440,300,30,20)];
  const candidate=plan(motifs);
  expect(candidate.errors).toEqual([]);
  expect(candidate.tiles).toHaveLength(4);
  expect(candidate.tiles.flatMap(t=>t.sourceObjectIds).sort()).toEqual(motifs.map(o=>o.id).sort());
  expect(candidate.releaseBlockers.length).toBeGreaterThan(0);
  expect(plan([...motifs].reverse()).tiles).toEqual(candidate.tiles);
  expect(planEmbroideryJob(motifs,{widthMm:700,heightMm:500,machine}).validation.valid).toBe(false);
 });
 it("reference tapered-sleeve rectangular proxy preserves intact motifs but does not validate taper",()=>{
  const motifs=[line("upper",70,20,20,20),line("middle",80,250,15,20),line("cuff",95,500,10,15)];
  const candidate=planHoopSegmentationCandidates(motifs,{widthMm:200,heightMm:650,machine});
  expect(candidate.errors).toEqual([]);
  expect(candidate.tiles).toHaveLength(3);
  expect(candidate.tiles.flatMap(t=>t.sourceObjectIds)).toEqual(["upper","middle","cuff"]);
  expect(candidate.releaseBlockers).toContain("manufacturer-hoop-orientation-and-fixturing-unverified");
  expect(candidate.registrationGeometryAudit?.jobEnvelopeMm).toEqual({width:200,height:650});
  expect(planEmbroideryJob(motifs,{widthMm:200,heightMm:650,machine}).validation.valid).toBe(false);
 });

});
