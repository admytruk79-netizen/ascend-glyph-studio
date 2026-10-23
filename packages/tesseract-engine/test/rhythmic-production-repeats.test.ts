import {describe,it,expect} from "vitest";
import type {GarmentZone} from "../src/garment";
import type {ProductionGlyphObject} from "../src/production-object";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "../src/garment-surface-math";
import {buildRhythmicProductionRepeats} from "../src/rhythmic-production-repeats";

const source:ProductionGlyphObject={
 id:"source-branch",conceptId:"growth",form:"branch",geometryRef:"ascend:branch",
 physical:{widthMm:12,heightMm:12,minScale:.5,maxScale:3,clearanceMm:2,rotationDeg:0},
 placement:{zoneId:"pilot",seamPolicy:"avoid",canRotate:true,wrapAllowed:true,xMm:70,yMm:50,rotationDeg:0},
 relations:{ports:["north","south"],allowed:["repeat"]},
 embroidery:{stitchFamily:"run",spacingMm:2.5,underlay:[],pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true},
 threadColor:"#111111",sourceBasis:[]
};
const zone:GarmentZone={
 id:"pilot",kind:"sleeve",surface:"tapered-cylinder",circumferenceMm:200,
 circumferenceEndMm:100,heightMm:100,editable:true,wrapAllowed:true,seamPositions:[0]
};
const fp=(o:ProductionGlyphObject):SurfaceFootprint=>({
 id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
 widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
 rotationDeg:o.placement.rotationDeg,clearanceMm:2
});

describe("production-realized rhythmic repeats",()=>{
 it("creates deterministic stitchable clones without changing canonical source geometry",()=>{
  const input=[source];
  const options={maxExtra:8,minGapMm:2};
  const a=buildRhythmicProductionRepeats(input,zone,{minYmm:30,maxYmm:70},options);
  const b=buildRhythmicProductionRepeats(input,zone,{minYmm:30,maxYmm:70},options);
  expect(a).toEqual(b);
  expect(a.length).toBeGreaterThan(0);
  expect(a.length).toBeLessThanOrEqual(8);
  expect(source.id).toBe("source-branch");
  expect(source.placement).toMatchObject({xMm:70,yMm:50});
  for(const clone of a){
   expect(clone.id).toContain(":rhythm:");
   expect(clone.geometryRef).toBe("ascend:branch");
   expect(clone.form).toBe("branch");
   expect(clone.sourceBasis).toEqual(source.sourceBasis);
  }
 });
 it("keeps every repeat inside the tapered seam-free band and clear of every other motif",()=>{
  const copies=buildRhythmicProductionRepeats([source],zone,{minYmm:30,maxYmm:70},{maxExtra:12,minGapMm:2});
  const all=[source,...copies];
  for(const copy of copies){
   const C=circumferenceAt(zone,copy.placement.yMm!);
   expect(copy.placement.xMm!-copy.physical.widthMm/2).toBeGreaterThanOrEqual(2);
   expect(copy.placement.xMm!+copy.physical.widthMm/2).toBeLessThanOrEqual(C-2);
   expect(copy.placement.yMm!-copy.physical.heightMm/2).toBeGreaterThanOrEqual(32);
   expect(copy.placement.yMm!+copy.physical.heightMm/2).toBeLessThanOrEqual(68);
  }
  for(let i=1;i<all.length;i++)for(let j=0;j<i;j++)
   expect(juxtaposition(zone,fp(all[i]!),fp(all[j]!)).valid).toBe(true);
 });
 it("fails closed when the band cannot fit another motif",()=>{
  const tiny:GarmentZone={...zone,surface:"cylinder",circumferenceMm:40,circumferenceEndMm:40,heightMm:20};
  const big:ProductionGlyphObject={...source,physical:{...source.physical,widthMm:35,heightMm:18},
   placement:{...source.placement,xMm:20,yMm:10}};
  expect(buildRhythmicProductionRepeats([big],tiny,{minYmm:0,maxYmm:20},{maxExtra:12,minGapMm:2})).toEqual([]);
  expect(buildRhythmicProductionRepeats([source],zone,{minYmm:30,maxYmm:70},{maxExtra:0,minGapMm:2})).toEqual([]);
 });
});
