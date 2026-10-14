/** Fabric coordinates, not stitch counts. Different warp/weft densities must
 * remain distinct; this helper does not transform canonical ASCEND glyphs. */
export type CountedFabricGrid={warpThreads:number;weftThreads:number;
 measuredWidthMm:number;measuredHeightMm:number;source:string;locator:string};
export function calibrateCountedFabricGrid(grid:CountedFabricGrid){
 if(![grid.warpThreads,grid.weftThreads].every(n=>Number.isInteger(n)&&n>0)
  ||![grid.measuredWidthMm,grid.measuredHeightMm].every(n=>Number.isFinite(n)&&n>0)
  ||![grid.source,grid.locator].every(s=>typeof s==='string'&&s.trim().length>0))throw new Error('motif-grid:invalid-calibration');
 const xPitchMm=grid.measuredWidthMm/grid.warpThreads,yPitchMm=grid.measuredHeightMm/grid.weftThreads;
 if(!Number.isFinite(xPitchMm)||!Number.isFinite(yPitchMm)||xPitchMm<=0||yPitchMm<=0)throw new Error('motif-grid:invalid-calibration');
 return {state:'REFERENCE' as const,xPitchMm,yPitchMm,evidence:{source:grid.source,locator:grid.locator},
  point:(warpIntervals:number,weftIntervals:number)=>{
   const x=warpIntervals*xPitchMm,y=weftIntervals*yPitchMm;
   if(!Number.isFinite(warpIntervals)||!Number.isFinite(weftIntervals)||!Number.isFinite(x)||!Number.isFinite(y))throw new Error('motif-grid:invalid-coordinate');
   return {x,y};
  },stitchCount:null,productionApproved:false as const};
}
