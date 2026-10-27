import type {GarmentZone} from "./garment";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "./garment-surface-math";
import type {ProductionGlyphObject} from "./production-object";

/**
 * Adds physical, independently digitizable repetitions of EXISTING ASCEND
 * production glyphs. This is not a preview SVG transform and does not invent
 * new source geometry or confer manufacturer/production validation.
 *
 * Only previously placed glyphs are eligible. Candidate placements are checked
 * against originals and all earlier repeats, the garment edge and the seam.
 * The production-object -> stitch-IR compiler remains the sole geometry source.
 */
export function buildRhythmicProductionRepeats(
 originals:readonly ProductionGlyphObject[],
 zone:GarmentZone,
 band:{minYmm:number;maxYmm:number},
 options:{maxExtra:number;minGapMm:number}
):ProductionGlyphObject[]{
 const limit=Math.max(0,Math.min(24,Math.floor(options.maxExtra)));
 const gap=Math.max(0,options.minGapMm);
 const height=zone.heightMm??0;
 if(!limit||!(height>0)||!(band.maxYmm>band.minYmm))return [];
 const sources=[...originals]
  .filter(o=>!o.branchLeaf&&Number.isFinite(o.placement.xMm)&&Number.isFinite(o.placement.yMm)&&o.physical.widthMm>0&&o.physical.heightMm>0)
  .sort((a,b)=>a.physical.widthMm*a.physical.heightMm-b.physical.widthMm*b.physical.heightMm||a.id.localeCompare(b.id))
  .filter((o,i,all)=>all.findIndex(x=>x.form===o.form)===i)
  .slice(0,3);
 if(!sources.length)return [];
 const extent=(f:SurfaceFootprint)=>{
  const a=(f.rotationDeg??0)*Math.PI/180;
  return {x:(Math.abs(Math.cos(a))*f.widthMm+Math.abs(Math.sin(a))*f.heightMm)/2,
   y:(Math.abs(Math.sin(a))*f.widthMm+Math.abs(Math.cos(a))*f.heightMm)/2};
 };
 const footprint=(o:ProductionGlyphObject):SurfaceFootprint=>({
  id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
  widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
  rotationDeg:o.placement.rotationDeg??o.physical.rotationDeg,clearanceMm:Math.max(gap,o.physical.clearanceMm)
 });
 const occupied=originals.filter(o=>Number.isFinite(o.placement.xMm)&&Number.isFinite(o.placement.yMm)).map(footprint);
 const smallestHeight=Math.min(...sources.map(o=>o.physical.heightMm));
 const usableHeight=band.maxYmm-band.minYmm;
 const rows=Math.max(1,Math.min(3,Math.floor(usableHeight/Math.max(1,smallestHeight+gap*3))));
 const cols=Math.max(3,Math.ceil(limit/rows)+2);
 const out:ProductionGlyphObject[]=[];
 for(let r=0;r<rows&&out.length<limit;r++){
  const y=band.minYmm+(r+.5)*usableHeight/rows;
  const C=circumferenceAt(zone,y);
  for(let c=0;c<cols&&out.length<limit;c++){
   const source=sources[(r*cols+c)%sources.length]!;
   const x=(c+.5)*C/cols;
   const f:SurfaceFootprint={id:`${source.id}:rhythm:${r}:${c}`,u:x,v:y,
    widthMm:source.physical.widthMm,heightMm:source.physical.heightMm,
    rotationDeg:source.placement.rotationDeg??source.physical.rotationDeg,clearanceMm:Math.max(gap,source.physical.clearanceMm)};
   const e=extent(f);
   // Conservative no-go treatment for the full rotated box, not just center.
   if(x-e.x<gap||x+e.x>C-gap||y-e.y<Math.max(0,band.minYmm)+gap||
      y+e.y>Math.min(height,band.maxYmm)-gap)continue;
   if(occupied.some(previous=>!juxtaposition(zone,f,previous).valid))continue;
   out.push({...source,id:f.id,
    placement:{...source.placement,xMm:x,yMm:y}});
   occupied.push(f);
  }
 }
 return out;
}
