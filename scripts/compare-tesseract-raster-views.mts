/** Read-only, local JSON diagnostic. Never modifies candidates or thresholds.
 * Usage: npx tsx scripts/compare-tesseract-raster-views.mts candidates.json
 * Input: [{ordinal:0,state:{mode:"sleeve",svg:"<svg...>",conceptSvg:"<svg...>"}}]
 */
import {readFile} from "node:fs/promises";
import {critiqueRaster} from "../packages/tesseract-engine/src/raster-critic";
import {gatingRasterSvg,compareRasterViews} from "../packages/tesseract-engine/src/raster-view-diagnostics";

const file=process.argv[2];
if(!file)throw new Error("usage: tsx scripts/compare-tesseract-raster-views.mts <candidate-state.json>");
const raw=JSON.parse(await readFile(file,"utf8"));
const rows=Array.isArray(raw)?raw:raw.candidates;
if(!Array.isArray(rows)||rows.length<1||rows.length>12)
 throw new Error("Expected 1..12 candidate records");
let errors=0;
for(const [i,row] of rows.entries()){
 const state=row.state??row;
 const mode=String(state.mode??"sleeve");
 const candidate={svg:state.svg??"",conceptSvg:state.conceptSvg};
 try{
  const primary=await critiqueRaster(gatingRasterSvg(mode,candidate));
  const comparison=await compareRasterViews(mode,candidate,critiqueRaster);
  if(comparison.status==="missing"||comparison.status==="error")errors++;
  console.log(JSON.stringify({
   ordinal:row.ordinal??i,patternId:state.patternId??null,mode,
   physicalSizeMm:state.physicalSizeMm??null,
   recomputedPrimaryView:comparison.gatingView,recomputedPrimary:primary,
   recomputedAlternateView:comparison.alternateView,
   alternateStatus:comparison.status,recomputedAlternate:comparison.alternateRaster??null,
   alternateError:comparison.error??null,storedHistoricalRaster:state.raster??null,
   note:"Diagnostic only; SVG views may have different extents. No physical/manufacturer validation."
  }));
 }catch(e){
  errors++;
  console.log(JSON.stringify({ordinal:row.ordinal??i,status:"error",error:String((e as Error).message).slice(0,160)}));
 }
}
console.log(JSON.stringify({processed:rows.length,errors,readOnly:true,productionApproved:false}));
if(errors)process.exitCode=1;
