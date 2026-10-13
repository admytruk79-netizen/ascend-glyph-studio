/** Deterministic pixel-to-composition analysis. Input pixels must come from a rights-reviewed image decoder. */
import type {Operation} from "./reference-structural-rules";
export type PixelFrame={width:number;height:number;rgba:Uint8Array|Uint8ClampedArray};
export type ImageStructure={schema:"ascend.image-structure.v1";foregroundRatio:number;horizontalBands:number;verticalBands:number;horizontalRepeatLagPx:number|null;verticalRepeatLagPx:number|null;operations:Operation[];warnings:string[]};
const clamp=(x:number)=>Math.max(0,Math.min(255,x));
export function analyzeEmbroideryPixels(frame:PixelFrame,backgroundRgb:[number,number,number],threshold=55):ImageStructure{
 const {width,height,rgba}=frame;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width*height>262_144||rgba.length!==width*height*4)throw Error("Invalid image dimensions or RGBA buffer");
 if(backgroundRgb.some(x=>!Number.isFinite(x)||x<0||x>255)||!Number.isFinite(threshold)||threshold<=0||threshold>441.673)throw Error("Invalid segmentation settings");
 const row=new Array<number>(height).fill(0),col=new Array<number>(width).fill(0);
 const mask=new Uint8Array(width*height);
 let count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,k=i*4,alpha=rgba[k+3]!/255;
  const dr=clamp(rgba[k]!)-backgroundRgb[0],dg=clamp(rgba[k+1]!)-backgroundRgb[1],db=clamp(rgba[k+2]!)-backgroundRgb[2];
  const fg=alpha>=0.5&&Math.hypot(dr,dg,db)>=threshold?1:0;
  mask[i]=fg;count+=fg;row[y]!+=fg;col[x]!+=fg;
 }
 const bands=(projection:number[],crossSize:number)=>{let n=0,active=false;for(const v of projection){const on=v/crossSize>=0.08;if(on&&!active)n++;active=on;}return n;};
 // Repeat score is based on whole-mask equality, not merely projection peaks.
 const lag=(horizontal:boolean):number|null=>{
  const length=horizontal?width:height,other=horizontal?height:width;
  let bestLag:number|null=null,best=-Infinity;
  for(let shift=2;shift<=Math.min(64,Math.floor(length/2));shift++){
   let matches=0,compared=0,positive=0;
   for(let a=0;a<length-shift;a+=2)for(let b=0;b<other;b+=2){
    const i=horizontal?b*width+a:a*width+b,j=horizontal?b*width+a+shift:(a+shift)*width+b;
    const p=mask[i]!,q=mask[j]!;
    if(p||q)positive++;
    if(p===q)matches++;
    compared++;
   }
   if(positive===0)continue;
   const score=matches/compared;
   if(score>best){best=score;bestLag=shift;}
  }
  return best>=0.93?bestLag:null;
 };
 const horizontalRepeatLagPx=lag(true),verticalRepeatLagPx=lag(false);
 const horizontalBands=bands(row,width),verticalBands=bands(col,height);
 const operations:Operation[]=[];
 if(horizontalRepeatLagPx!==null||verticalRepeatLagPx!==null)operations.push("repeat");
 if(horizontalBands>1||verticalBands>1)operations.push("alternate");
 return {schema:"ascend.image-structure.v1",foregroundRatio:count/(width*height),horizontalBands,verticalBands,horizontalRepeatLagPx,verticalRepeatLagPx,operations,warnings:["Pixel heuristics only; not a trained motif detector or historical attribution.","Foreground segmentation depends on an explicitly chosen background and threshold.","No symbolic meaning, rights clearance or production approval inferred from pixels."]};
}
