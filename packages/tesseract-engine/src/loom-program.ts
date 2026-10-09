/**
 * Jacquard-inspired loom execution plan from canonical production stitch geometry.
 *
 * Historical precedent: independently selected warp ends per pick, as documented
 * by Science Museum Group (Jacquard loom) and the Smithsonian punched-card archive.
 * An execution plan is NOT a machine-specific punch-card file or a verified woven draft.
 *
 * Each pick contains one binary lift decision per warp end. The ground is plain
 * weave, while traced motif paths invert selected interlacements. Float-length
 * limits are measured and treated as an explicit manufacturing gate.
 */
import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";

export interface LoomPlan {
 version:1;
 widthMm:number;
 heightMm:number;
 endsPerCm:number;
 picksPerCm:number;
 ends:number;
 picks:number;
 /** Indexed from first to last pick; '1' raises the corresponding warp end. */
 liftRows:string[];
 /** Mask of motif cells, separate from physical lifting instructions. */
 motifRows:string[];
 maxWarpFloat:number;
 maxWeftFloat:number;
 manufacturable:boolean;
 errors:string[];
}

const distanceToSegment=(p:StitchIrPoint,a:StitchIrPoint,b:StitchIrPoint)=>{
 const dx=b.x-a.x,dy=b.y-a.y;
 const t=dx*dx+dy*dy===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
 return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
};
function containsPoint(p:StitchIrPoint,poly:readonly StitchIrPoint[]){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i]!,b=poly[j]!;
  if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
function motifAt(p:StitchIrPoint,objects:readonly StitchIrObject[],samplingMm:number){
 for(const o of objects){
  if(o.kind==="fill"){
   if(containsPoint(p,o.polygon))return true;
  }else{
   const width=o.kind==="satin"?o.width:samplingMm;
   for(let i=1;i<o.path.length;i++)if(distanceToSegment(p,o.path[i-1]!,o.path[i]!)<=Math.max(samplingMm*.5,width*.5))return true;
  }
 }
 return false;
}
function longestRun(row:string){
 let max=0,n=0,last="";
 for(const c of row){if(c===last)n++;else{n=1;last=c;}max=Math.max(max,n);}
 return max;
}
export function compileLoomPlan(
 objects:readonly StitchIrObject[],
 options:{widthMm:number;heightMm:number;endsPerCm:number;picksPerCm:number;maxFloatEnds?:number;maxFloatPicks?:number;maxCells?:number}
):LoomPlan {
 const {widthMm,heightMm,endsPerCm,picksPerCm}=options;
 if(![widthMm,heightMm,endsPerCm,picksPerCm].every(x=>Number.isFinite(x)&&x>0))throw new Error("loom-invalid-dimensions");
 const ends=Math.round(widthMm*endsPerCm/10),picks=Math.round(heightMm*picksPerCm/10);
 if(ends<2||picks<2||ends*picks>(options.maxCells??500000))throw new Error("loom-grid-capacity");
 const motifRows:string[]=[],liftRows:string[]=[];
 for(let y=0;y<picks;y++){
  let mask="",lifts="";
  for(let x=0;x<ends;x++){
   const p={x:(x+.5)*widthMm/ends,y:(y+.5)*heightMm/picks};
   const marked=motifAt(p,objects,Math.max(widthMm/ends,heightMm/picks));
   mask+=marked?"1":"0";
   const ground=(x+y)%2===0;
   lifts+=(marked?!ground:ground)?"1":"0";
  }
  motifRows.push(mask);liftRows.push(lifts);
 }
 const maxWeftFloat=Math.max(...liftRows.map(longestRun));
 let maxWarpFloat=0;
 for(let x=0;x<ends;x++)maxWarpFloat=Math.max(maxWarpFloat,longestRun(liftRows.map(row=>row[x]!).join("")));
 const errors:string[]=[];
 if(maxWeftFloat>(options.maxFloatEnds??6))errors.push("loom-weft-float-exceeds-limit");
 if(maxWarpFloat>(options.maxFloatPicks??6))errors.push("loom-warp-float-exceeds-limit");
 return {version:1,widthMm,heightMm,endsPerCm,picksPerCm,ends,picks,liftRows,motifRows,maxWarpFloat,maxWeftFloat,manufacturable:errors.length===0,errors};
}
