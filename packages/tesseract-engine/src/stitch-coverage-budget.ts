import type {GarmentZone} from "./garment";
import {circumferenceAt} from "./garment-surface-math";
import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";

/**
 * Coarse, deterministic DIGITAL estimate of visible mark distribution in the
 * final physical stitch IR. This is neither thread coverage, stitch density,
 * fabric coverage nor a manufacturer-validated sew-out. Canonical geometry
 * and manufacturing parameters are never modified by this measurement.
 */
export type StitchCoverageBudget={
 evidence:"DIGITAL_RASTER_ESTIMATE";
 grid:{columns:number;rows:number;cellWidthMm:number;cellHeightMm:number};
 motifCoverage:number;
 connectorCoverage:number;
 framingCoverage:number;
 totalCoverage:number;
 horizontalMotifSpan:number;
 verticalMotifSpan:number;
 largestEmptyColumnRun:number;
 motifCoverageByThird:[number,number,number];
 validCells:number;
};
type Band={minYmm:number;maxYmm:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const points=(o:StitchIrObject)=>o.kind==="fill"?o.polygon:o.path;
function pointSegmentDistanceSquared(p:StitchIrPoint,a:StitchIrPoint,b:StitchIrPoint):number{
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den>0?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;
 const x=a.x+t*dx,y=a.y+t*dy;
 return (p.x-x)**2+(p.y-y)**2;
}
function insidePolygon(p:StitchIrPoint,poly:StitchIrPoint[]):boolean{
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i]!,b=poly[j]!;
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)
   inside=!inside;
 }
 return inside;
}
export function measureStitchCoverageBudget(
 objects:readonly StitchIrObject[],zone:GarmentZone,band:Band,seamGapMm=0
):StitchCoverageBudget{
 const height=zone.heightMm??0;
 const lo=band.minYmm,hi=band.maxYmm;
 if(!Number.isFinite(height+lo+hi+seamGapMm)||height<=0||
    lo<0||hi>height||hi<=lo||seamGapMm<0)
  throw new Error("invalid digital coverage band");
 const width=Math.max(circumferenceAt(zone,lo),circumferenceAt(zone,hi));
 if(!Number.isFinite(width)||width<=2*seamGapMm)
  throw new Error("invalid digital coverage circumference");
 const columns=clamp(Math.ceil(width/2.5),16,192);
 const rows=clamp(Math.ceil((hi-lo)/2.5),8,128);
 const dx=width/columns,dy=(hi-lo)/rows,size=columns*rows;
 const valid=new Uint8Array(size),motif=new Uint8Array(size),
  connector=new Uint8Array(size),framing=new Uint8Array(size);
 let validCells=0;
 for(let row=0;row<rows;row++){
  const y=lo+(row+.5)*dy,C=circumferenceAt(zone,y);
  for(let col=0;col<columns;col++){
   const x=(col+.5)*dx;
   if(x>=seamGapMm&&x<=C-seamGapMm){valid[row*columns+col]=1;validCells++;}
  }
 }
 const paint=(target:Uint8Array,x0:number,x1:number,y0:number,y1:number,
  hit:(p:StitchIrPoint)=>boolean)=>{
  const c0=clamp(Math.floor(x0/dx),0,columns-1),c1=clamp(Math.floor(x1/dx),0,columns-1);
  const r0=clamp(Math.floor((y0-lo)/dy),0,rows-1),r1=clamp(Math.floor((y1-lo)/dy),0,rows-1);
  if(x1<0||x0>width||y1<lo||y0>hi)return;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
   const index=r*columns+c;
   if(valid[index]&&hit({x:(c+.5)*dx,y:lo+(r+.5)*dy}))target[index]=1;
  }
 };
 for(const o of objects){
  const pts=points(o);
  if(pts.length<2||pts.some(p=>!Number.isFinite(p.x+p.y)))
   throw new Error("invalid digital coverage geometry: "+o.id);
  const target=o.id.startsWith("composition:")?framing:
   o.id.startsWith("connector:")?connector:motif;
  if(o.kind==="fill"){
   const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
   paint(target,Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys),
    p=>insidePolygon(p,pts));
  }else{
   if(o.kind==="satin"&&(!Number.isFinite(o.width)||o.width<=0))
    throw new Error("invalid digital coverage satin width: "+o.id);
   // Cell-diagonal expansion prevents sub-cell running stitches disappearing.
   // This deliberately estimates an upper bound on rasterized marks.
   const radius=(o.kind==="satin"?o.width/2:.2)+Math.hypot(dx,dy)/2;
   for(let i=1;i<pts.length;i++){
    const a=pts[i-1]!,b=pts[i]!;
    paint(target,Math.min(a.x,b.x)-radius,Math.max(a.x,b.x)+radius,
     Math.min(a.y,b.y)-radius,Math.max(a.y,b.y)+radius,
     p=>pointSegmentDistanceSquared(p,a,b)<=radius*radius);
   }
  }
 }
 const thirdsValid=[0,0,0],thirdsMotif=[0,0,0];
 const occupiedColumns=new Uint8Array(columns),occupiedRows=new Uint8Array(rows);
 let markedMotif=0,markedConnector=0,markedFraming=0,markedAny=0;
 for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
  const idx=r*columns+c;
  if(!valid[idx])continue;
  const third=Math.min(2,Math.floor(c*3/columns));
  thirdsValid[third]!++;
  if(motif[idx]){
   markedMotif++;thirdsMotif[third]!++;occupiedColumns[c]=1;occupiedRows[r]=1;
  }
  if(connector[idx])markedConnector++;
  if(framing[idx])markedFraming++;
  if(motif[idx]||connector[idx]||framing[idx])markedAny++;
 }
 let longest=0,run=0;
 for(const occupied of occupiedColumns){
  run=occupied?0:run+1;longest=Math.max(longest,run);
 }
 const fraction=(n:number,d=validCells)=>d>0?n/d:0;
 return {
  evidence:"DIGITAL_RASTER_ESTIMATE",
  grid:{columns,rows,cellWidthMm:dx,cellHeightMm:dy},
  motifCoverage:fraction(markedMotif),
  connectorCoverage:fraction(markedConnector),
  framingCoverage:fraction(markedFraming),
  totalCoverage:fraction(markedAny),
  horizontalMotifSpan:fraction(occupiedColumns.reduce((n,v)=>n+v,0),columns),
  verticalMotifSpan:fraction(occupiedRows.reduce((n,v)=>n+v,0),rows),
  largestEmptyColumnRun:fraction(longest,columns),
  motifCoverageByThird:[
   fraction(thirdsMotif[0]!,thirdsValid[0]!),
   fraction(thirdsMotif[1]!,thirdsValid[1]!),
   fraction(thirdsMotif[2]!,thirdsValid[2]!)
  ],
  validCells
 };
}
