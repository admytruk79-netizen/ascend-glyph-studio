import type {RasterCritique} from "./raster-critic";

/**
 * Diagnostic comparison of the artwork preview and actual stitch-IR geometry.
 * Only the caller's primary raster verdict is allowed to determine survival.
 * These measurements are NOT physical stitch-density or manufacturer validation.
 */
export type RasterView="canonical-stitch-ir"|"concept-preview";
export type RasterViewComparison={
 gatingView:RasterView;
 alternateView:RasterView;
 status:"ok"|"missing"|"identical"|"error";
 alternateRaster?:RasterCritique;
 error?:string;
};

type CandidateViews={svg:string;conceptSvg?:string};
type Critique=(svg:string)=>Promise<RasterCritique>;

export function gatingRasterView(mode:string,candidate:CandidateViews):RasterView{
 return mode==="field"&&!!candidate.conceptSvg?"concept-preview":"canonical-stitch-ir";
}

export function gatingRasterSvg(mode:string,candidate:CandidateViews):string{
 const svg=gatingRasterView(mode,candidate)==="concept-preview"?candidate.conceptSvg:candidate.svg;
 if(!svg?.trim())throw new Error("Missing gating raster SVG");
 return svg;
}

/**
 * Compare the non-gating view for the SAME selected candidate.
 * Diagnostic failure is recorded, never substituted for a passing verdict.
 * The two SVGs may use different viewports; raw coverage is not a calibrated
 * garment-zone comparison and must not be used to change production thresholds.
 */
export async function compareRasterViews(
 mode:string,candidate:CandidateViews,critique:Critique
):Promise<RasterViewComparison>{
 const gatingView=gatingRasterView(mode,candidate);
 const alternateView:RasterView=gatingView==="canonical-stitch-ir"?"concept-preview":"canonical-stitch-ir";
 const alternateSvg=alternateView==="concept-preview"?candidate.conceptSvg:candidate.svg;
 if(!alternateSvg?.trim())return {gatingView,alternateView,status:"missing"};
 if(alternateSvg===gatingRasterSvg(mode,candidate))return {gatingView,alternateView,status:"identical"};
 try{
  const alternateRaster=await critique(alternateSvg);
  const values=[alternateRaster.coverage,alternateRaster.clutter,alternateRaster.emptyColumns,alternateRaster.balance,alternateRaster.quality];
  if(values.some(x=>!Number.isFinite(x)))throw new Error("Invalid alternate raster metrics");
  return {gatingView,alternateView,status:"ok",alternateRaster};
 }catch(e){
  return {gatingView,alternateView,status:"error",error:String((e as Error).message).slice(0,160)};
 }
}
