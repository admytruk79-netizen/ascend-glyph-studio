import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import type {ProductionGlyphObject} from "../src/production-object";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "../src/garment-surface-math";
import {buildHierarchicalProductionAssembly} from "../src/hierarchical-production-assembly";
import {compileProductionObjectsToStitchIr} from "../src/production-stitch-ir";

const base:ProductionGlyphObject={
 id:"focal",conceptId:"growth",form:"branch",geometryRef:"ascend:branch",
 physical:{widthMm:16,heightMm:16,minScale:.5,maxScale:3,clearanceMm:2,rotationDeg:0},
 placement:{zoneId:"pilot",seamPolicy:"avoid",canRotate:true,wrapAllowed:true,xMm:30,yMm:60,rotationDeg:0},
 relations:{ports:["north","south"],allowed:["repeat","branch"]},
 embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],
  pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true},
 threadColor:"#111111",sourceBasis:["inkstitch-routing"]
};
const second:ProductionGlyphObject={...base,id:"secondary",form:"seed",geometryRef:"ascend:seed",
 physical:{...base.physical,widthMm:12,heightMm:12},
 placement:{...base.placement,xMm:330,yMm:60},
 embroidery:{...base.embroidery,stitchFamily:"satin",satinWidthMm:2.2}};
const third:ProductionGlyphObject={...base,id:"accent",form:"axis",geometryRef:"ascend:axis",
 physical:{...base.physical,widthMm:10,heightMm:10},
 placement:{...base.placement,xMm:40,yMm:35}};
const cylinder:GarmentZone={id:"pilot",kind:"sleeve",surface:"cylinder",
 circumferenceMm:360,heightMm:120,editable:true,wrapAllowed:true,seamPositions:[0]};
const fp=(o:ProductionGlyphObject):SurfaceFootprint=>({
 id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
 widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
 rotationDeg:o.placement.rotationDeg,clearanceMm:2
});
const opts={maxExtra:18,minGapMm:2,minFeatureMm:.8};

describe("canonical hierarchical production assembly",()=>{
 it("produces deterministic macro/meso/micro stitchable placements with intact lineage",()=>{
  const originals=[base,second,third];
  const before=JSON.stringify(originals);
  const a=buildHierarchicalProductionAssembly(originals,cylinder,{minYmm:20,maxYmm:100},opts);
  const b=buildHierarchicalProductionAssembly(originals,cylinder,{minYmm:20,maxYmm:100},opts);
  expect(a).toEqual(b);
  expect(a.length).toBeGreaterThan(3);
  expect(a.length).toBeLessThanOrEqual(opts.maxExtra);
  expect(new Set(a.map(x=>x.assembly?.tier))).toEqual(new Set(["macro","meso","micro"]));
  expect(JSON.stringify(originals)).toBe(before);
  for(const clone of a){
   const source=originals.find(x=>clone.id.startsWith(x.id+":assembly:"))!;
   expect(source).toBeDefined();
   expect(clone.geometryRef).toBe(source.geometryRef);
   expect(clone.form).toBe(source.form);
   expect(clone.sourceBasis).toEqual(source.sourceBasis);
   expect(clone.assembly?.anchorId).toBeTruthy();
   if(clone.embroidery.satinWidthMm!==undefined)
    expect(clone.embroidery.satinWidthMm).toBeGreaterThanOrEqual(.7);
  }
  const stitches=compileProductionObjectsToStitchIr(a);
  expect(stitches.length).toBeGreaterThanOrEqual(a.length);
  expect(stitches.every(x=>x.id.includes(":assembly:"))).toBe(true);
 });
 it("respects the tightest tapered circumference, seam, band and pairwise clearance",()=>{
  const taper:GarmentZone={...cylinder,surface:"tapered-cylinder",
   circumferenceMm:160,circumferenceEndMm:65,heightMm:100};
  const original={...base,placement:{...base.placement,xMm:30,yMm:50}};
  const a=buildHierarchicalProductionAssembly([original],taper,
   {minYmm:20,maxYmm:80},{maxExtra:20,minGapMm:2,minFeatureMm:.8});
  const all=[original,...a];
  for(const o of a){
   const rotation=(o.placement.rotationDeg??0)*Math.PI/180;
   const ex=(Math.abs(Math.cos(rotation))*o.physical.widthMm+
    Math.abs(Math.sin(rotation))*o.physical.heightMm)/2;
   const ey=(Math.abs(Math.sin(rotation))*o.physical.widthMm+
    Math.abs(Math.cos(rotation))*o.physical.heightMm)/2;
   const x=o.placement.xMm!,y=o.placement.yMm!;
   const c=Math.min(circumferenceAt(taper,y-ey),circumferenceAt(taper,y+ey));
   expect(x-ex).toBeGreaterThanOrEqual(2);
   expect(x+ex).toBeLessThanOrEqual(c-2);
   expect(y-ey).toBeGreaterThanOrEqual(22);
   expect(y+ey).toBeLessThanOrEqual(78);
  }
  for(let i=1;i<all.length;i++)for(let j=0;j<i;j++)
   expect(juxtaposition(taper,fp(all[i]!),fp(all[j]!)).valid).toBe(true);
 });
 it("fails closed when the envelope cannot accommodate another glyph",()=>{
  const tiny:GarmentZone={...cylinder,circumferenceMm:38,heightMm:20};
  const big:ProductionGlyphObject={...base,
   physical:{...base.physical,widthMm:34,heightMm:18},
   placement:{...base.placement,xMm:19,yMm:10}};
  expect(buildHierarchicalProductionAssembly([big],tiny,
   {minYmm:0,maxYmm:20},opts)).toEqual([]);
  expect(buildHierarchicalProductionAssembly([base],cylinder,
   {minYmm:20,maxYmm:100},{...opts,maxExtra:0})).toEqual([]);
 });
});
