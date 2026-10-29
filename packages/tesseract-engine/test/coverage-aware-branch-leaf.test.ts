import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import type {ProductionGlyphObject} from "../src/production-object";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "../src/garment-surface-math";
import {buildCoverageAwareBranchLeafAssembly} from "../src/coverage-aware-branch-leaf";
import {buildPortAwareStitchConnectors} from "../src/port-aware-stitch-connectors";
import {compileProductionObjectsToStitchIr} from "../src/production-stitch-ir";
import {measureStitchCoverageBudget} from "../src/stitch-coverage-budget";

const branch:ProductionGlyphObject={
 id:"branch-1",conceptId:"growth",form:"branch",geometryRef:"ascend:branch",
 physical:{widthMm:16,heightMm:16,minScale:.5,maxScale:3,clearanceMm:2,rotationDeg:0},
 placement:{zoneId:"test",seamPolicy:"avoid",canRotate:true,wrapAllowed:true,xMm:30,yMm:60,rotationDeg:0},
 relations:{ports:["north","south"],allowed:["branch","repeat"]},
 embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],
  pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true},
 threadColor:"#111111",sourceBasis:["inkstitch-routing"]
};
const seed:ProductionGlyphObject={...branch,id:"seed-1",form:"seed",geometryRef:"ascend:seed",
 physical:{...branch.physical,widthMm:12,heightMm:12},
 placement:{...branch.placement,xMm:330,yMm:60},
 embroidery:{...branch.embroidery,stitchFamily:"satin",satinWidthMm:2.2}};
const cylinder:GarmentZone={id:"test",kind:"sleeve",surface:"cylinder",
 circumferenceMm:360,heightMm:120,editable:true,wrapAllowed:true,seamPositions:[0]};
const band={minYmm:20,maxYmm:100};
const options={maxExtra:18,minGapMm:2,minFeatureMm:.8};
const fp=(o:ProductionGlyphObject):SurfaceFootprint=>({
 id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
 widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
 rotationDeg:o.placement.rotationDeg??o.physical.rotationDeg,clearanceMm:2
});
describe("coverage-aware source-derived branch/leaf grammar (experimental)",()=>{
 it("places deterministic real stitchable clusters across garment thirds without mutating ASCEND sources",()=>{
  const originals=[branch,seed],before=JSON.stringify(originals);
  const a=buildCoverageAwareBranchLeafAssembly(originals,cylinder,band,options);
  expect(a).toEqual(buildCoverageAwareBranchLeafAssembly(originals,cylinder,band,options));
  expect(JSON.stringify(originals)).toBe(before);
  expect(a.length).toBeGreaterThanOrEqual(4);
  expect(a.length).toBeLessThanOrEqual(options.maxExtra);
  const stems=a.filter(o=>o.branchLeaf?.role==="stem");
  const leaves=a.filter(o=>o.branchLeaf?.role==="leaf");
  expect(stems.length).toBeGreaterThan(0);
  expect(leaves.length).toBeGreaterThanOrEqual(stems.length);
  expect(new Set(stems.map(o=>Math.floor(3*o.placement.xMm!/360))).size).toBeGreaterThanOrEqual(2);
  for(const o of a){
   const source=o.branchLeaf?.role==="stem"?branch:seed;
   expect(o.geometryRef).toBe(source.geometryRef);
   expect(o.sourceBasis).toEqual(source.sourceBasis);
   expect(o.branchLeaf?.sourcePrimitiveStatus).toBe("source-derived-provisional");
   expect(o.branchLeaf?.validationState).toBe("REFERENCE");
   expect(o.assembly?.anchorId).toBeTruthy();
  }
  const stitch=compileProductionObjectsToStitchIr(a);
  expect(stitch.length).toBeGreaterThanOrEqual(a.length);
  expect(stitch.every(s=>s.id.includes("branch-leaf:"))).toBe(true);
  const beforeMarks=measureStitchCoverageBudget(
   compileProductionObjectsToStitchIr(originals),cylinder,band,2);
  const afterMarks=measureStitchCoverageBudget(
   compileProductionObjectsToStitchIr([...originals,...a]),cylinder,band,2);
  expect(afterMarks.motifCoverage).toBeGreaterThan(beforeMarks.motifCoverage);
  expect(afterMarks.evidence).toBe("DIGITAL_RASTER_ESTIMATE");
 });
 it("enforces tapered sleeve, seam, band and pairwise rotated-box clearance",()=>{
  const taper:GarmentZone={...cylinder,surface:"tapered-cylinder",
   circumferenceMm:180,circumferenceEndMm:90,heightMm:120};
  const b={...branch,placement:{...branch.placement,xMm:25,yMm:55}};
  const s={...seed,placement:{...seed.placement,xMm:105,yMm:55}};
  const bnd={minYmm:20,maxYmm:90};
  const a=buildCoverageAwareBranchLeafAssembly([b,s],taper,bnd,options);
  const all=[b,s,...a];
  for(const o of a){
   const f=fp(o),theta=(f.rotationDeg??0)*Math.PI/180;
   const ex=(Math.abs(Math.cos(theta))*f.widthMm+Math.abs(Math.sin(theta))*f.heightMm)/2;
   const ey=(Math.abs(Math.sin(theta))*f.widthMm+Math.abs(Math.cos(theta))*f.heightMm)/2;
   const C=Math.min(circumferenceAt(taper,f.v-ey),circumferenceAt(taper,f.v+ey));
   expect(f.u-ex).toBeGreaterThanOrEqual(2);
   expect(f.u+ex).toBeLessThanOrEqual(C-2);
   expect(f.v-ey).toBeGreaterThanOrEqual(bnd.minYmm+2);
   expect(f.v+ey).toBeLessThanOrEqual(bnd.maxYmm-2);
  }
  for(let i=2;i<all.length;i++)for(let j=0;j<i;j++)
   expect(juxtaposition(taper,fp(all[i]!),fp(all[j]!)).valid).toBe(true);
 });
 it("fails closed without source seed, with non-ASCEND geometry or insufficient capacity",()=>{
  expect(buildCoverageAwareBranchLeafAssembly([branch],cylinder,band,options)).toEqual([]);
  expect(buildCoverageAwareBranchLeafAssembly(
   [{...branch,geometryRef:"corpus:branch"},seed],cylinder,band,options)).toEqual([]);
  expect(buildCoverageAwareBranchLeafAssembly([branch,seed],cylinder,band,
   {...options,maxExtra:1})).toEqual([]);
  const small:GarmentZone={...cylinder,circumferenceMm:40,heightMm:20};
  const crowdedBranch={...branch,physical:{...branch.physical,widthMm:34,heightMm:18},
   placement:{...branch.placement,xMm:20,yMm:10}};
  const crowdedSeed={...seed,placement:{...seed.placement,xMm:20,yMm:10}};
  expect(buildCoverageAwareBranchLeafAssembly([crowdedBranch,crowdedSeed],small,
   {minYmm:0,maxYmm:20},options)).toEqual([]);
 });
 it("rejects decorative branch-leaf clones when no same-thread source-port route exists",()=>{
  const incompatibleSeed={...seed,threadColor:"#b20000"};
  const originals=[branch,incompatibleSeed],before=JSON.stringify(originals);
  const clones=buildCoverageAwareBranchLeafAssembly(originals,cylinder,band,options);
  expect(clones).toEqual([]);
  expect(JSON.stringify(originals)).toBe(before);
 });
 it("retains only stems and leaves with routable canonical source-port junctions",()=>{
  const originals=[branch,seed],before=JSON.stringify(originals);
  const clones=buildCoverageAwareBranchLeafAssembly(originals,cylinder,band,options);
  expect(clones.length).toBeGreaterThan(0);
  const clusters=[...new Set(clones.map(o=>o.branchLeaf?.clusterId))];
  for(const clusterId of clusters){
   const scoped=clones.map(o=>o.branchLeaf?.clusterId===clusterId
    ?o:{...o,branchLeaf:undefined});
   const routed=buildPortAwareStitchConnectors([...originals,...scoped],cylinder,band,{
    maxConnections:2,minGapMm:options.minGapMm,maxSpanMm:28,branchLeafClusterOnly:true
   });
   const joined=new Set(routed.lineage.flatMap(link=>[link.fromObjectId,link.toObjectId]));
   const members=clones.filter(o=>o.branchLeaf?.clusterId===clusterId);
   expect(members.some(o=>o.branchLeaf?.role==="stem")).toBe(true);
   expect(members.some(o=>o.branchLeaf?.role==="leaf")).toBe(true);
   expect(members.every(o=>joined.has(o.id))).toBe(true);
   expect(routed.lineage.every(link=>link.validationState==="REFERENCE")).toBe(true);
  }
  expect(JSON.stringify(originals)).toBe(before);
 });

});
