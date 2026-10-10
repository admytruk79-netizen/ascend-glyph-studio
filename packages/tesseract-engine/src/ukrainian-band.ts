import evidence from "../data/ukrainian-band-evidence.json";
import type {StitchIrObject} from "./production-stitch-ir";
import {compoundIrSvg} from "./compound-textile-compiler";

export const UKRAINIAN_BAND_SOURCE=evidence;
export type UkrainianBandKind="stepped-cross"|"diamond-rosette"|"linked-diamonds"|"hooked-medallions"|"joined-diamond-network";
export const UKRAINIAN_BAND_KINDS:UkrainianBandKind[]=["stepped-cross","diamond-rosette","linked-diamonds","hooked-medallions","joined-diamond-network"];
export type UkrainianBandOptions={seed:string;kind:UkrainianBandKind;widthMm:number;heightMm:number;repeats?:number;bands?:1|3|5;palette?:"hutsul"|"red-black"};
const hash=(s:string)=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
/** Newly constructed nested/paired figures informed by pp. 1157–1158, not traced motifs. */
function complexCell(dx:number,dy:number,variant:number,paired:boolean):number {
 const d=dx+dy;
 const a=variant%2?3:2,b=variant%2?2:3;
 if(paired){
  // Two touching networks: half figures meet on the central axis.
  const nx=Math.abs(dx-12),ny=Math.abs(dy-11),nd=nx+ny;
  if(nd===11||nd===12)return 4;
  if(nd===9||nd===10)return 0;
  if(nd===7||nd===8)return a;
  if(nd<=6){
   if(nx===0||ny===0)return 4;
   if(nd===5)return 0;
   if(nd===3||nd===4)return b;
   return nd<=1?4:1;
  }
  if(dx<=1||dy<=1)return (dx+dy)%3===0?4:0;
  return (dx+dy)%4===0?0:1;
 }
 // Nested stepped diamond outlines enclose four smaller, divided diamond figures.
 if(d===23||d===24)return 4;
 if(d===21||d===22)return 0;
 if(d===19||d===20)return a;
 if(d===17||d===18)return 4;
 if(d<=16){
  const qx=Math.abs(dx-7),qy=Math.abs(dy-7),qd=qx+qy;
  if(dx<=1||dy<=1)return d<=3?b:0;
  if(qd===7)return 0;
  if(qd===5||qd===6)return 4;
  if(qd===3||qd===4)return b;
  if(qd<=2)return qd===0?4:0;
  // Turned-in hooks around the small figures, with several geometric variants.
  if((dx===3&&dy>=4&&dy<=11)||(dy===3&&dx>=4&&dx<=11))return a;
  if((dx===5&&dy>=9&&dy<=11)||(dy===5&&dx>=9&&dx<=11))return 4;
  return (variant>=2&&(dx===dy||Math.abs(dx-dy)===1))?a:1;
 }
 // Boundary-centred rosettes occupy the field between the principal medallions.
 const gx=24-dx,gd=gx+dy;
 if(gd===19||gd===20)return 0;
 if(gd===17||gd===18)return 4;
 if(gd===15||gd===16)return b;
 if(gd<15){
  if(gx===dy||gx<=1||dy<=1)return 0;
  const little=Math.abs(gx-5)+Math.abs(dy-5);
  return little===4?4:little<=2?a:1;
 }
 // Small hooked teeth articulate the outside corners instead of solid wedges.
 return (d%4===0||dx%6===dy%6)?0:1;
}
/** New counted-cell constructions from reviewed source grammar, not traced source motifs.
 * The same fill objects drive preview/export and the design IR. No machine-file claim.
 */
export function generateUkrainianBand(o:UkrainianBandOptions){
 if(!UKRAINIAN_BAND_KINDS.includes(o.kind))throw new Error("Unknown Ukrainian band family");
 if(!Number.isFinite(o.widthMm)||!Number.isFinite(o.heightMm)||o.widthMm<40||o.widthMm>500||o.heightMm<20||o.heightMm>300)throw new Error("Invalid band dimensions");
 if(o.palette!==undefined&&!['hutsul','red-black'].includes(o.palette))throw new Error("Unknown band palette");
 const bandCount=o.bands??1;
 if(![1,3,5].includes(bandCount))throw new Error("Band count must be 1, 3 or 5");
 // Cell proportions are our construction choices. The paper supports the hierarchy,
 // not these exact widths. Secondary motifs share the main unit without cropping.
 let panels=bandCount===1?[{start:6,height:23,primary:true}]:bandCount===3?
  [{start:6,height:11,primary:false},{start:21,height:23,primary:true},{start:48,height:11,primary:false}]:
  [{start:6,height:7,primary:false},{start:17,height:11,primary:false},{start:32,height:23,primary:true},{start:59,height:11,primary:false},{start:74,height:7,primary:false}];
 const complex=o.kind==="hooked-medallions"||o.kind==="joined-diamond-network";
 const unit=complex?49:25;
 const rows=(bandCount===1?35:bandCount===3?65:87)*(complex?2:1)-(complex?1:0);
 if(complex)panels=panels.map(p=>({...p,start:p.start*2,height:p.height*2-1}));
 const repeats=o.repeats??Math.max(3,Math.min(24,Math.round(o.widthMm/o.heightMm*rows/unit)));
 if(!Number.isInteger(repeats)||repeats<3||repeats>24)throw new Error("Repeat count must be 3–24");
 const colours=o.palette==="red-black"?["#a52c32","#252322","#a52c32","#252322","#f6f0df"]:["#a52c32","#252322","#ddb946","#52664a","#f6f0df"];
 const cols=repeats*unit;
 const cellX=o.widthMm/cols,cellY=o.heightMm/rows,cell=Math.min(cellX,cellY),x0=0,y0=0;
 const variant=hash(o.seed)%4,phase=variant%2;
 const grid:number[][]=Array.from({length:rows},()=>Array(cols).fill(-1));
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const u=x%unit,dx=Math.abs(u-(unit-1)/2),tile=Math.floor(x/unit);
  const panel=panels.find(p=>y>=p.start&&y<p.start+p.height);
  const edgeRow=Math.min(y,rows-1-y);
  let ink=1;
  // Paired, subordinate framing rows. Endpoints share the same periodic unit.
  if(edgeRow===0)ink=1;
  else if(edgeRow===2)ink=dx%4<2?0:1;
  else if(edgeRow===4)ink=(dx+phase)%4<2?3:2;
  else if(edgeRow===1||edgeRow===3)ink=4;
  else if(edgeRow===5)ink=dx%2?0:4;
  else if(panel){
   const dy=Math.abs(y-(panel.start+(panel.height-1)/2)),d=dx+dy;
   ink=1;
   if(complex){
    if(panel.primary)ink=complexCell(dx,dy,variant,o.kind==="joined-diamond-network");
    else {
     const mx=Math.abs(Math.min(u,unit-1-u)-12),radius=(panel.height-1)/2,md=mx+dy;
     ink=md===radius?4:md===radius-1?0:md===radius-2?2:md<radius-2?((mx===dy||mx===0||dy===0)?0:(md%3===0?4:3)):((mx+dy)%4===0?0:1);
    }
   }else if(!panel.primary){
    const miniX=Math.abs(Math.min(u,24-u)-6),radius=(panel.height-1)/2,miniD=miniX+dy;
    ink=miniD===radius?4:miniD===radius-1?0:miniD<radius-1?((miniX<=1||dy<=1)?((tile+phase)%2?2:0):3):((miniX+dy)%3===0?0:1);
   }else{
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
   // Interstitial diamonds and oblique crosses join the main figures into a field.
   // The boundary-centred construction is mirrored and periodic across tile seams.
   if(d>12){
    const gapX=Math.min(u,24-u),gapD=gapX+dy;
    ink=gapD===9||gapD===10?4:gapD===7||gapD===8?0:
      gapD<7?((gapX===dy||gapX<=1||dy<=1)?2:3):
      ((dx+dy)%3===0?0:1);
   }else if(ink===1&&d<9){
    // Secondary nested cells occupy the spaces around the principal cross.
    ink=(dx+dy)%4===0?4:(dx===dy?2:1);
   }
   }
  }
  else {
   // Fine separator rows are patterned rather than transparent gutters.
   const separator=panels.some(p=>y===p.start-2||y===p.start+p.height+1);
   ink=separator?(dx%2?0:4):((dx+edgeRow)%4<2?2:1);
  }
  grid[y]![x]=ink;
 }
 const objects:StitchIrObject[]=[];let inkCells=0,ornamentCells=0;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;){
  const value=grid[row]![col]!;if(value<0){col++;continue;}
  let end=col+1;while(end<cols&&grid[row]![end]===value)end++;
  if(value!==4)inkCells+=end-col;
  if(value!==1)ornamentCells+=end-col;
  const x=x0+col*cellX,y=y0+row*cellY,w=(end-col)*cellX;
  objects.push({kind:"fill",id:`ukrainian:${row}:${col}`,color:colours[value]!,polygon:[{x,y},{x:x+w,y},{x:x+w,y:y+cellY},{x,y:y+cellY},{x,y}],angle:row%2?0:90,rowSpacing:.43});
  col=end;
 }
 const metadata={version:"ukrainian-band/3",sourceIds:[evidence.source.id],kind:o.kind,seed:o.seed,repeats,repeatUnitCells:unit,structuralVariant:variant,construction:complex?(o.kind==="hooked-medallions"?"nested-four-part-hooked-medallions":"joined-half-motif-network"):"simple-counted-band",bandCount,bands:panels,paperSources:[{doi:"10.15407/nz2022.05.1147",pages:[1154,1155,1156,1157,1158],use:"composition-hierarchy-and-interstitial-motifs",dimensions:"implementation-choice"}],cellMm:cell,cellSizeMm:{x:cellX,y:cellY},rows,cols,inkCoverage:inkCells/(rows*cols),ornamentCoverage:ornamentCells/(rows*cols),layout:"full-extent-connected-field",status:"design-prototype",geometry:"shared-fill-ir",conditioning:"reviewed-Neon-source-grammar",notMachineValidated:true};
 const svg=compoundIrSvg(objects,o.widthMm,o.heightMm).replace(/<rect[^>]+\/>/,"").replace("><polygon",`><title>Ukrainian source-informed ${o.kind} band</title><desc>New counted-cell design using reviewed Ukrainian embroidery structure. Design prototype.</desc><metadata>${JSON.stringify(metadata)}</metadata><polygon`);
 return {svg,objects,metadata,grid,palette:colours,widthMm:o.widthMm,heightMm:o.heightMm};
}
