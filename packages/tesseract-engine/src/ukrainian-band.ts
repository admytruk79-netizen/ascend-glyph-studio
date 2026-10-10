import evidence from "../data/ukrainian-band-evidence.json";
import type {StitchIrObject} from "./production-stitch-ir";
import {compoundIrSvg} from "./compound-textile-compiler";

export const UKRAINIAN_BAND_SOURCE=evidence;
export type UkrainianBandKind="stepped-cross"|"diamond-rosette"|"linked-diamonds";
export const UKRAINIAN_BAND_KINDS:UkrainianBandKind[]=["stepped-cross","diamond-rosette","linked-diamonds"];
export type UkrainianBandOptions={seed:string;kind:UkrainianBandKind;widthMm:number;heightMm:number;repeats?:number;palette?:"hutsul"|"red-black"};
const hash=(s:string)=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
/** New counted-cell constructions from reviewed source grammar, not traced source motifs.
 * The same fill objects drive preview/export and the design IR. No machine-file claim.
 */
export function generateUkrainianBand(o:UkrainianBandOptions){
 if(!UKRAINIAN_BAND_KINDS.includes(o.kind))throw new Error("Unknown Ukrainian band family");
 if(!Number.isFinite(o.widthMm)||!Number.isFinite(o.heightMm)||o.widthMm<40||o.widthMm>500||o.heightMm<20||o.heightMm>300)throw new Error("Invalid band dimensions");
 if(o.palette!==undefined&&!['hutsul','red-black'].includes(o.palette))throw new Error("Unknown band palette");
 const repeats=o.repeats??Math.max(3,Math.min(12,Math.round(o.widthMm/(o.heightMm*.72))));
 if(!Number.isInteger(repeats)||repeats<3||repeats>12)throw new Error("Repeat count must be 3–12");
 const colours=o.palette==="red-black"?["#a52c32","#252322","#a52c32","#252322","#f6f0df"]:["#a52c32","#252322","#ddb946","#52664a","#f6f0df"];
 const rows=35,unit=25,cols=repeats*unit;
 const cell=Math.min(o.widthMm/cols,o.heightMm/rows),x0=(o.widthMm-cols*cell)/2,y0=(o.heightMm-rows*cell)/2;
 const phase=hash(o.seed)%2;
 const grid:number[][]=Array.from({length:rows},()=>Array(cols).fill(-1));
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const u=x%unit,dx=Math.abs(u-12),dy=Math.abs(y-17),d=dx+dy,tile=Math.floor(x/unit);
  let ink=-1;
  // Paired, subordinate framing rows. Endpoints share the same periodic unit.
  if(y===0||y===34)ink=1;
  else if(y===2||y===32)ink=dx%4<2?0:1;
  else if(y===4||y===30)ink=(dx+phase)%4<2?3:2;
  else if(y>=6&&y<=28){
   ink=1;
   if(o.kind==="stepped-cross"){
    if(d===11||d===12)ink=4;
    else if(d===9||d===10)ink=(tile+phase)%2?3:2;
    else if(d<9){ink=((dx<=2&&dy<=7)||(dy<=2&&dx<=7))?0:1;if(dx<=1&&dy<=1)ink=(tile+phase)%2?2:3;}
    else if(d>12&&dy>=8)ink=(dx%6<3)?0:3;
   }else if(o.kind==="diamond-rosette"){
    if(d>=10&&d<=12)ink=0;
    else if(d===8||d===9)ink=4;
    else if(d<8){const star=(dx<=1||dy<=1||dx===dy);ink=star?((tile+phase)%2?2:0):3;if(dx<=1&&dy<=1)ink=1;}
   }else{
    const edge=Math.abs(d-10)<=1;
    ink=edge?4:d<9?((dx===dy||dx<=1||dy<=1)?0:((tile+phase)%2?3:2)):1;
    if(d===12)ink=0;
   }
  }
  grid[y]![x]=ink;
 }
 const objects:StitchIrObject[]=[];let inkCells=0;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;){
  const value=grid[row]![col]!;if(value<0){col++;continue;}
  let end=col+1;while(end<cols&&grid[row]![end]===value)end++;
  if(value!==4)inkCells+=end-col;
  const x=x0+col*cell,y=y0+row*cell,w=(end-col)*cell;
  objects.push({kind:"fill",id:`ukrainian:${row}:${col}`,color:colours[value]!,polygon:[{x,y},{x:x+w,y},{x:x+w,y:y+cell},{x,y:y+cell},{x,y}],angle:row%2?0:90,rowSpacing:.43});
  col=end;
 }
 const metadata={version:"ukrainian-band/1",sourceIds:[evidence.source.id],kind:o.kind,seed:o.seed,repeats,cellMm:cell,rows,cols,inkCoverage:inkCells*cell*cell/(o.widthMm*o.heightMm),status:"design-prototype",geometry:"shared-fill-ir",conditioning:"reviewed-Neon-source-grammar",notMachineValidated:true};
 const svg=compoundIrSvg(objects,o.widthMm,o.heightMm).replace(/<rect[^>]+\/>/,"").replace("><polygon",`><title>Ukrainian source-informed ${o.kind} band</title><desc>New counted-cell design using reviewed Ukrainian embroidery structure. Design prototype.</desc><metadata>${JSON.stringify(metadata)}</metadata><polygon`);
 return {svg,objects,metadata,grid,palette:colours,widthMm:o.widthMm,heightMm:o.heightMm};
}
