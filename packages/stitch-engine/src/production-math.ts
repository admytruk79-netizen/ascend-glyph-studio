import {polylineLength,polygonArea,dist,type Pt} from "./geometry.js";
import {stitchObject,type DesignObject} from "./plan.js";
import type {StitchRecipe} from "./recipes.js";

export type StitchFamily="run"|"satin"|"fill";

export interface StitchMathCalibration{
  /** Multiplicative correction learned from measured sew-outs. 1 = no correction. */
  countFactor?:Partial<Record<StitchFamily,number>>;
  /** Needle-thread metres per 1000 stitches. AMANN ticket-40 planning default: 4.6 m. */
  needleMetersPer1000?:number;
  /** Bobbin-thread metres per 1000 stitches. AMANN ticket-40 planning default: 2.3 m. */
  bobbinMetersPer1000?:number;
  /** Fixed seconds per trim and color change for planning, machine/operator dependent. */
  trimSeconds?:number;
  colorChangeSeconds?:number;
}

export interface ObjectStitchMath{
  objectId:string;
  family:StitchFamily;
  baseStitches:number;
  scaleExponent:number;
  scale:number;
  predictedStitches:number;
  baseGeometry:{pathLengthMm?:number;areaMm2?:number;widthMm?:number};
}

export interface ProductionMathEstimate{
  scale:number;
  predictedStitches:number;
  needleThreadM:number;
  bobbinThreadM:number;
  totalThreadM:number;
  estimatedMachineMinutes:number;
  colors:number;
  trims:number;
  objects:ObjectStitchMath[];
  equation:string;
}

const factor=(c:StitchMathCalibration|undefined,k:StitchFamily)=>Math.max(.01,c?.countFactor?.[k]??1);
const exponent=(o:DesignObject):number=>o.kind==="fill"?2:1;

/**
 * Predict stitch growth under uniform geometric scale.
 *
 * For each object i:
 *   N_i(s) = k_i * N_i(1) * s ^ p_i
 * where p=1 for run/satin and p=2 for area fills.
 *
 * Total:
 *   N(s) = sum_i N_i(s)
 *
 * This is a planning model. The digitized result remains authoritative because
 * auto-spacing, minimum stitch rules, underlay, boundary effects and fabric
 * compensation make scaling piecewise rather than perfectly power-law.
 */
export function estimateProductionMath(
  objects:DesignObject[],
  recipe:StitchRecipe,
  scale=1,
  calibration:StitchMathCalibration={}
):ProductionMathEstimate{
  if(!(scale>0))throw new Error("scale must be positive");
  const rows:ObjectStitchMath[]=objects.map(o=>{
    const baseStitches=stitchObject(o,recipe).reduce((n,r)=>n+Math.max(0,r.length-1),0);
    const p=exponent(o),family=o.kind;
    const predicted=baseStitches*Math.pow(scale,p)*factor(calibration,family);
    const geom=o.kind==="fill"
      ?{areaMm2:Math.abs(polygonArea(o.polygon))}
      :o.kind==="satin"
        ?{pathLengthMm:polylineLength(o.path),widthMm:o.width}
        :{pathLengthMm:polylineLength(o.path)};
    return {objectId:o.id,family,baseStitches,scaleExponent:p,scale,predictedStitches:predicted,baseGeometry:geom};
  });
  const predictedStitches=Math.max(0,Math.round(rows.reduce((n,x)=>n+x.predictedStitches,0)));
  const needleRate=calibration.needleMetersPer1000??4.6;
  const bobbinRate=calibration.bobbinMetersPer1000??2.3;
  const needleThreadM=predictedStitches/1000*needleRate;
  const bobbinThreadM=predictedStitches/1000*bobbinRate;
  const colors=new Set(objects.map(o=>o.color)).size;
  // Planning-only travel overhead. Exact trims/jumps come from plan().
  const trims=Math.max(0,colors-1);
  const secondsAtSpeed=recipe.speedSpm>0?predictedStitches/recipe.speedSpm*60:0;
  const overhead=trims*(calibration.trimSeconds??2)+Math.max(0,colors-1)*(calibration.colorChangeSeconds??6);
  return {
    scale,predictedStitches,
    needleThreadM:Number(needleThreadM.toFixed(3)),
    bobbinThreadM:Number(bobbinThreadM.toFixed(3)),
    totalThreadM:Number((needleThreadM+bobbinThreadM).toFixed(3)),
    estimatedMachineMinutes:Number(((secondsAtSpeed+overhead)/60).toFixed(2)),
    colors,trims,objects:rows,
    equation:"N(s)=Σ[k_i·N_i(1)·s^p_i], p_run=1, p_satin=1, p_fill=2"
  };
}

export interface RealizedStitchMath{
  stitchCount:number;
  stitchedPathMm:number;
  averageStitchMm:number;
}

/** Measure the actual compiled stitch path. This is authoritative for the generated file. */
export function measureRealizedStitches(commands:ReadonlyArray<{cmd:string;x:number;y:number}>):RealizedStitchMath{
  let prev:Pt|undefined,stitchCount=0,stitchedPathMm=0;
  for(const c of commands){
    if(c.cmd==="stitch"){
      const p={x:c.x,y:c.y};
      if(prev)stitchedPathMm+=dist(prev,p);
      prev=p;stitchCount++;
    }else if(c.cmd==="jump"){
      prev={x:c.x,y:c.y};
    }
  }
  return {stitchCount,stitchedPathMm:Number(stitchedPathMm.toFixed(3)),averageStitchMm:stitchCount>1?Number((stitchedPathMm/(stitchCount-1)).toFixed(3)):0};
}

/**
 * Empirical scale exponent from two measured stitch counts:
 * p = ln(N2/N1) / ln(s2/s1)
 * Useful after sew-outs to replace family defaults with garment/material-specific evidence.
 */
export function empiricalScaleExponent(n1:number,s1:number,n2:number,s2:number):number{
  if(!(n1>0&&n2>0&&s1>0&&s2>0&&s1!==s2))throw new Error("positive distinct scales and stitch counts required");
  return Math.log(n2/n1)/Math.log(s2/s1);
}
