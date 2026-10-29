import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import type {ProductionGlyphObject} from "../src/production-object";
import {ASCEND_PRIMITIVES} from "../src/ascend-primitives";
import {buildPortAwareStitchConnectors} from "../src/port-aware-stitch-connectors";
import {buildCoverageAwareBranchLeafAssembly} from "../src/coverage-aware-branch-leaf";
import {compileProductionObjectsToStitchIr,stitchIrFootprints} from "../src/production-stitch-ir";
import {evaluateSurfaceLayout} from "../src/garment-surface-math";
import {assessCandidateSurface} from "../src/surface-candidate-gate";
import {planEmbroideryJob} from "../src/manufacturing-job-plan";

const zone:GarmentZone={id:"pilot",kind:"sleeve",surface:"cylinder",
 circumferenceMm:120,heightMm:100,editable:true,wrapAllowed:true,seamPositions:[0]};
const glyph=(id:string,x:number,y:number):ProductionGlyphObject=>({
 id,conceptId:"balance",form:"axis",geometryRef:"ascend:axis",
 physical:{widthMm:14,heightMm:14,minScale:.5,maxScale:3,clearanceMm:1,rotationDeg:0},
 placement:{zoneId:"pilot",seamPolicy:"avoid",canRotate:true,wrapAllowed:true,xMm:x,yMm:y,rotationDeg:0},
 relations:{ports:["north","south"],allowed:["bridge","branch"]},
 embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],
  pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true},
 threadColor:"#111111",sourceBasis:["inkstitch-routing"]
});
const a=glyph("upper",60,30),b=glyph("lower",60,55);
const band={minYmm:10,maxYmm:80},options={maxConnections:2,minGapMm:1,maxSpanMm:25};

describe("port-aware production stitch connectors",()=>{
 it("joins canonical source ports as real run stitch geometry with explicit REFERENCE lineage",()=>{
  const before=JSON.stringify([a,b]),paths=JSON.stringify(ASCEND_PRIMITIVES.axis.paths);
  const first=buildPortAwareStitchConnectors([a,b],zone,band,options);
  const second=buildPortAwareStitchConnectors([a,b],zone,band,options);
  expect(first).toEqual(second);
  expect(first.objects).toHaveLength(1);
  expect(first.objects[0]!.kind).toBe("run");
  expect(first.objects[0]!.id).toBe("connector:0");
  expect(first.lineage).toEqual([{
   fromObjectId:"upper",toObjectId:"lower",fromPortId:"bottom",toPortId:"top",
   fromGeometryRef:"ascend:axis",toGeometryRef:"ascend:axis",
   fromSourceStatus:"source-derived-provisional",toSourceStatus:"source-derived-provisional",
   validationState:"REFERENCE"
  }]);
  expect(first.allowedOverlapPairs).toEqual(["connector:0|upper","connector:0|lower"]);
  expect(JSON.stringify([a,b])).toBe(before);
  expect(JSON.stringify(ASCEND_PRIMITIVES.axis.paths)).toBe(paths);
  const stitch=[...compileProductionObjectsToStitchIr([a,b]),...first.objects];
  const report=evaluateSurfaceLayout(zone,stitchIrFootprints(stitch,1),
   {allowedOverlapPairs:first.allowedOverlapPairs});
  expect(assessCandidateSurface(report,"avoid").valid).toBe(true);
  const job=planEmbroideryJob(stitch,{widthMm:120,heightMm:100});
  expect(job.sourceObjectIds).toContain("connector:0");
  expect(job.validation.valid).toBe(true);
 });
 it("rejects narrow third-party obstacles even between sampling points",()=>{
  const blocker={...glyph("blocker",60,42.5),
   geometryRef:"unreviewed:unknown",
   physical:{...a.physical,widthMm:.5,heightMm:.5}};
  const result=buildPortAwareStitchConnectors([a,b,blocker],zone,band,options);
  expect(result.objects).toEqual([]);
  expect(result.lineage).toEqual([]);
 });
 it("rejects connectors at a tapered seam and outside the garment band",()=>{
  const taper:GarmentZone={...zone,surface:"tapered-cylinder",
   circumferenceMm:100,circumferenceEndMm:60};
  const nearSeam=[glyph("a",7,30),glyph("b",7,55)];
  expect(buildPortAwareStitchConnectors(nearSeam,taper,band,options).objects).toEqual([]);
  expect(buildPortAwareStitchConnectors([a,b],zone,
   {minYmm:38,maxYmm:45},options).objects).toEqual([]);
 });
 it("does not silently bridge distinct thread-color blocks",()=>{
  const contrasting={...b,threadColor:"#aa0000"};
  expect(buildPortAwareStitchConnectors([a,contrasting],zone,band,options).objects).toEqual([]);
 });
 it("allows two distinct stem ports only inside one source-tracked cluster",()=>{
  const cluster=(o:ProductionGlyphObject,role:"stem"|"leaf",clusterId="fixture")=>({
   ...o,branchLeaf:{clusterId,role,sourcePrimitiveStatus:"source-derived-provisional" as const,
    validationState:"REFERENCE" as const}
  });
  const stem=cluster(glyph("stem",60,55),"stem");
  const upper=cluster(glyph("leaf-upper",60,30),"leaf");
  const lower=cluster(glyph("leaf-lower",60,80),"leaf");
  const opts={...options,maxConnections:4,branchLeafClusterOnly:true};
  const joined=buildPortAwareStitchConnectors([upper,stem,lower],zone,
   {minYmm:10,maxYmm:95},opts);
  expect(joined.objects).toHaveLength(2);
  const stemPorts=joined.lineage.map(l=>
   l.fromObjectId==="stem"?l.fromPortId:l.toPortId);
  expect(new Set(stemPorts)).toEqual(new Set(["top","bottom"]));
  expect(joined.lineage.every(l=>l.validationState==="REFERENCE")).toBe(true);
  const differentCluster=cluster(lower,"leaf","other-cluster");
  expect(buildPortAwareStitchConnectors([upper,stem,differentCluster],zone,
   {minYmm:10,maxYmm:95},opts).objects).toHaveLength(1);
  expect(buildPortAwareStitchConnectors([upper,stem,lower],zone,
   {minYmm:10,maxYmm:95},{...opts,maxConnections:0}).objects).toEqual([]);
 });
 it("connects at least one port-aligned, real branch/seed placement without editing source glyphs",()=>{
  const sleeve:GarmentZone={...zone,circumferenceMm:360,heightMm:120};
  const sourceBranch={...glyph("source-branch",30,60),form:"branch",
   geometryRef:"ascend:branch",physical:{...a.physical,widthMm:16,heightMm:16}};
  const sourceSeed={...glyph("source-seed",330,60),form:"seed",
   geometryRef:"ascend:seed",physical:{...a.physical,widthMm:12,heightMm:12},
   embroidery:{...a.embroidery,stitchFamily:"satin" as const,satinWidthMm:2.2}};
  const originals=[sourceBranch,sourceSeed],before=JSON.stringify(originals);
  const clones=buildCoverageAwareBranchLeafAssembly(originals,sleeve,
   {minYmm:20,maxYmm:100},{maxExtra:18,minGapMm:2,minFeatureMm:.8});
  expect(clones.some(g=>g.branchLeaf?.role==="stem")).toBe(true);
  const result=buildPortAwareStitchConnectors([...originals,...clones],sleeve,
   {minYmm:20,maxYmm:100},
   {maxConnections:12,minGapMm:2,maxSpanMm:28,branchLeafClusterOnly:true});
  expect(result.objects.length).toBeGreaterThan(0);
  expect(result.objects.every(o=>o.kind==="run")).toBe(true);
  expect(result.lineage.every(l=>l.fromObjectId.includes("branch-leaf:")&&
   l.toObjectId.includes("branch-leaf:"))).toBe(true);
  expect(JSON.stringify(originals)).toBe(before);
  expect(result.lineage.every(l=>l.validationState==="REFERENCE")).toBe(true);
 });
 it("does not use unreviewed geometry or fabricate links when no compatible ports exist",()=>{
  const invalid={...a,geometryRef:"corpus:axis"};
  expect(buildPortAwareStitchConnectors([invalid,b],zone,band,options).objects).toEqual([]);
  expect(buildPortAwareStitchConnectors([a,b],zone,band,
   {...options,maxConnections:0}).objects).toEqual([]);
 });
});
