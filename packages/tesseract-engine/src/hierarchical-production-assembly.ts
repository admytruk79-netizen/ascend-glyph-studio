import type {GarmentZone} from "./garment";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "./garment-surface-math";
import type {ProductionGlyphObject} from "./production-object";

export type AssemblyTier="macro"|"meso"|"micro";

/**
 * Spatially assembles EXISTING ASCEND production glyphs into a focal / satellite /
 * accent hierarchy. Every output is a separately placed production object and
 * is compiled to stitch IR later. No source paths or cultural provenance are
 * generated here; proximity does NOT imply a sewn connection.
 *
 * Physical sizes, satin widths, garment bounds, taper and pairwise clearances
 * are checked before accepting a placement. This is a conservative digital
 * feasibility heuristic, NOT a validated manufacturer recipe or sew-out.
 */
export function buildHierarchicalProductionAssembly(
 originals:readonly ProductionGlyphObject[],
 zone:GarmentZone,
 band:{minYmm:number;maxYmm:number},
 options:{maxExtra:number;minGapMm:number;minFeatureMm:number}
):ProductionGlyphObject[]{
 const maxExtra=Math.max(0,Math.min(24,Math.floor(options.maxExtra)));
 const gap=Math.max(0,options.minGapMm);
 const minFeature=Math.max(0,options.minFeatureMm);
 const height=zone.heightMm??0;
 if(!maxExtra||!(height>0)||!(band.maxYmm>band.minYmm))return [];
 const valid=originals.filter(o=>
  Number.isFinite(o.placement.xMm)&&Number.isFinite(o.placement.yMm)&&
  o.physical.widthMm>0&&o.physical.heightMm>0);
 if(!valid.length)return [];
 const sources=[...valid].sort((a,b)=>
  b.physical.widthMm*b.physical.heightMm-a.physical.widthMm*a.physical.heightMm||
  a.id.localeCompare(b.id));
 const occupied:SurfaceFootprint[]=valid.map(o=>({
  id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
  widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
  rotationDeg:o.placement.rotationDeg??o.physical.rotationDeg,
  clearanceMm:Math.max(gap,o.physical.clearanceMm)
 }));
 const out:ProductionGlyphObject[]=[];
 const extent=(width:number,h:number,rotation:number)=>{
  const a=rotation*Math.PI/180;
  return {x:(Math.abs(Math.cos(a))*width+Math.abs(Math.sin(a))*h)/2,
   y:(Math.abs(Math.sin(a))*width+Math.abs(Math.cos(a))*h)/2};
 };
 const tryPlace=(source:ProductionGlyphObject,tier:AssemblyTier,anchorId:string,
  x:number,y:number,factor:number):ProductionGlyphObject|undefined=>{
  if(out.length>=maxExtra)return undefined;
  const width=source.physical.widthMm*factor,heightMm=source.physical.heightMm*factor;
  const satin=source.embroidery.satinWidthMm;
  const scaledSatin=satin===undefined?undefined:satin*factor;
  if(width<minFeature*4||heightMm<minFeature*4||
     (scaledSatin!==undefined&&(scaledSatin<.7||scaledSatin>8)))return undefined;
  const rotation=source.placement.rotationDeg??source.physical.rotationDeg;
  const e=extent(width,heightMm,rotation);
  const minY=Math.max(0,band.minYmm)+gap,maxY=Math.min(height,band.maxYmm)-gap;
  if(y-e.y<minY||y+e.y>maxY)return undefined;
  // On tapered sleeves the tightest circumference can be at either edge of
  // the rotated motif, not at its center.
  const C=Math.min(circumferenceAt(zone,y-e.y),circumferenceAt(zone,y+e.y));
  if(x-e.x<gap||x+e.x>C-gap)return undefined;
  const id=`${source.id}:assembly:${tier}:${out.length}`;
  const f:SurfaceFootprint={id,u:x,v:y,widthMm:width,heightMm,
   rotationDeg:rotation,clearanceMm:Math.max(gap,source.physical.clearanceMm)};
  if(occupied.some(p=>!juxtaposition(zone,f,p).valid))return undefined;
  const clone:ProductionGlyphObject={
   ...source,id,
   physical:{...source.physical,widthMm:width,heightMm,rotationDeg:rotation},
   placement:{...source.placement,xMm:x,yMm:y,rotationDeg:rotation},
   embroidery:{...source.embroidery,
    ...(scaledSatin===undefined?{}:{satinWidthMm:scaledSatin})},
   assembly:{tier,anchorId,scaleFactor:factor}
  };
  out.push(clone);occupied.push(f);
  return clone;
 };
 const focal=sources[0]!;
 const midY=(band.minYmm+band.maxYmm)/2;
 const centralC=circumferenceAt(zone,midY);
 // Macro-level cadence creates multiple potential focal clusters. Existing
 // glyphs remain anchors even when no additional macro fits.
 const anchors:ProductionGlyphObject[]=[...sources.slice(0,3)];
 for(const fraction of [.25,.5,.75]){
  const placed=tryPlace(focal,"macro",focal.id,centralC*fraction,midY,1);
  if(placed)anchors.push(placed);
 }
 // Meso flanks are placed adjacent to a focal anchor, not on a blind grid.
 // Micro accents are placed around accepted meso nodes, respecting the same
 // physical checks. No invented connectors are inserted into stitch IR.
 for(const [i,anchor] of anchors.entries()){
  if(out.length>=maxExtra)break;
  const secondary=sources.find(o=>o.form!==anchor.form)??sources[(i+1)%sources.length]!;
  const ax=anchor.placement.xMm!,ay=anchor.placement.yMm!;
  const width=secondary.physical.widthMm*.75;
  const dx=anchor.physical.widthMm/2+width/2+gap*1.5;
  for(const sign of [-1,1]){
   const meso=tryPlace(secondary,"meso",anchor.id,ax+sign*dx,ay,.75);
   if(!meso)continue;
   const accent=sources.find(o=>o.form!==secondary.form&&o.form!==anchor.form)
    ??sources.find(o=>o.form!==secondary.form)??secondary;
   const dy=meso.physical.heightMm/2+accent.physical.heightMm*.55/2+gap*1.5;
   for(const vertical of [-1,1]){
    if(tryPlace(accent,"micro",meso.id,meso.placement.xMm!,meso.placement.yMm!+vertical*dy,.55))break;
   }
  }
 }
 return out;
}
