import type {GarmentConfiguration,GarmentZone} from "./garment";
import type {MediumId,ProductionLimits} from "./medium-compiler";
import {DEFAULT_LIMITS} from "./medium-compiler";
import {zoneSurfaceArea} from "./garment-surface-math";

export type ConstructionIntent={
 targetOccupancy?:number;
 seamPolicy?:"avoid"|"continuous"|"resolve";
 maxColors?:number;
 hierarchyDepth?:number;
};

export type ConstructionEnvelope={
 medium:MediumId;
 minFeatureMm:number;
 minGapMm:number;
 maxScaleLevels:number;
 maxNodes:number;
 maxRecursiveDepth:number;
 maxBranching:number;
 supportsCrossing:boolean;
 targetOccupancy:number;
 seamPolicy:"avoid"|"continuous"|"resolve";
 maxColors?:number;
 zoneBudgets:ReadonlyArray<{
  zoneId:string;
  areaMm2:number;
  usableAreaMm2:number;
  maxNodes:number;
  wrap:boolean;
 }>;
};

/**
 * Conservative by-construction capacity envelope.
 * Node capacity is derived before grammar expansion from physical zone area,
 * minimum gap and the nominal footprint of a smallest valid motif.
 */
export function deriveConstructionEnvelope(
 garment:GarmentConfiguration|undefined,
 medium:MediumId,
 limits:ProductionLimits=DEFAULT_LIMITS[medium],
 desired:ConstructionIntent={}
):ConstructionEnvelope{
 const zones=(garment?.zones??[]).filter(z=>z.editable);
 const nominalDiameter=Math.max(limits.minFeatureMm*8,limits.minGapMm*4,8);
 const targetOccupancy=Math.max(.05,Math.min(.9,desired.targetOccupancy??.42));
 const nominalCell=Math.pow(nominalDiameter+limits.minGapMm*2,2);
 const zoneBudgets=zones.map((z:GarmentZone)=>{
   const area=z.surface==="flat"
     ?Math.max(0,(z.widthMm??z.circumferenceMm??0)*(z.heightMm??0))
     :zoneSurfaceArea(z);
   const usable=area*.72;
   return {zoneId:z.id,areaMm2:area,usableAreaMm2:usable,maxNodes:Math.max(1,Math.floor((usable*targetOccupancy)/Math.max(1,nominalCell))),wrap:z.wrapAllowed};
 });
 const physicalMax=zoneBudgets.length?Math.max(...zoneBudgets.map(z=>z.maxNodes)):48;
 const maxNodes=Math.max(4,Math.min(48,physicalMax));
 // Recursive branching is bounded by actual node capacity, not aesthetic preference.
 const maxRecursiveDepth=Math.max(1,Math.min(4,desired.hierarchyDepth??(maxNodes<8?1:maxNodes<20?2:maxNodes<40?3:4)));
 const maxBranching=maxNodes<10?2:maxNodes<24?3:maxNodes<40?4:5;
 return {
  medium,minFeatureMm:limits.minFeatureMm,minGapMm:limits.minGapMm,
  maxScaleLevels:limits.maxScaleLevels,maxNodes,maxRecursiveDepth,maxBranching,
  supportsCrossing:limits.supportsCrossing,targetOccupancy,seamPolicy:desired.seamPolicy??"avoid",maxColors:desired.maxColors,zoneBudgets
 };
}
