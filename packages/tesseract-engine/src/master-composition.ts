import type {MediumId} from "./medium-compiler";
import type {SashEvidenceGrammar} from "./sash-evidence-grammar";

export type MasterCompositionMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type MasterCompositionInput={svg:string;mode:MasterCompositionMode;complexity:number;medium:MediumId;width:number;height:number;seed:string;sashGrammar?:SashEvidenceGrammar};

const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const unit=(n:number,min:number,max:number)=>min+(n/0xffffffff)*(max-min);
function body(svg:string){
 const open=svg.indexOf(">"),close=svg.lastIndexOf("</svg>");let b=open>=0&&close>open?svg.slice(open+1,close):svg;
 const ms=b.indexOf("<metadata"),me=b.indexOf("</metadata>");if(ms>=0&&me>=ms)b=b.slice(0,ms)+b.slice(me+11);
 return b;
}
function strokeFor(m:MediumId){return m==="print"?1.8:m==="embroidery"?2.65:m==="emboss"?3.15:3.35}
function scholarlySashComposition(input:MasterCompositionInput,b:string){
 const g=input.sashGrammar!;const {width,height,medium,mode}=input;
 const centerH=height*g.centralShare;
 const flankH=Math.max(1,(height-centerH)*.5);
 const inner=Math.max(1.5,height*.018);
 const sourceId="sash-source";
 const defs=`<defs><g id="${sourceId}">${b}</g>
  <clipPath id="sash-top"><rect x="0" y="0" width="${width}" height="${Math.max(1,flankH-inner).toFixed(2)}"/></clipPath>
  <clipPath id="sash-center"><rect x="0" y="${flankH.toFixed(2)}" width="${width}" height="${centerH.toFixed(2)}"/></clipPath>
  <clipPath id="sash-bottom"><rect x="0" y="${(flankH+centerH+inner).toFixed(2)}" width="${width}" height="${Math.max(1,flankH-inner).toFixed(2)}"/></clipPath>
 </defs>`;
 const topY=Math.max(0,flankH*.08),centerY=flankH,bottomY=flankH+centerH+inner;
 const top=`<svg x="0" y="${topY.toFixed(2)}" width="${width}" height="${Math.max(1,flankH-inner).toFixed(2)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" clip-path="url(#sash-top)"><use href="#${sourceId}"/></svg>`;
 const center=`<svg x="0" y="${centerY.toFixed(2)}" width="${width}" height="${centerH.toFixed(2)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" clip-path="url(#sash-center)"><use href="#${sourceId}"/></svg>`;
 const bottom=`<svg x="0" y="${bottomY.toFixed(2)}" width="${width}" height="${Math.max(1,flankH-inner).toFixed(2)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" clip-path="url(#sash-bottom)"><use href="#${sourceId}" transform="translate(${width} 0) scale(-1 1)"/></svg>`;
 const railY1=flankH,railY2=flankH+centerH;
 const rails=`<g data-sash-layer="framing" opacity=".72"><path d="M0 ${railY1.toFixed(2)} H${width}"/><path d="M0 ${railY2.toFixed(2)} H${width}"/></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-master-composition="scholarly-sash-v1" data-mode="${mode}" data-medium="${medium}" data-source-grammar="${g.id}" data-source-doi="${g.source.doi}">${defs}<g fill="none" stroke="currentColor" stroke-width="${strokeFor(medium)}" stroke-linecap="round" stroke-linejoin="round">${top}${center}${bottom}${rails}</g></svg>`;
}

export function compileMasterComposition(input:MasterCompositionInput){
 const {mode,complexity,medium,width,height,seed}=input,b=body(input.svg),h=hash(seed+"|"+mode+"|"+medium);
 if(input.sashGrammar&&(mode==="band"||mode==="sleeve"||mode==="cuff"||mode==="collar"))return scholarlySashComposition(input,b);
 const focalX=unit(h,.28,.43)*width,focalY=unit((h*2654435761)>>>0,.42,.58)*height;
 const counterX=unit((h^0x9e3779b9)>>>0,.66,.79)*width,counterY=unit((h^0x85ebca6b)>>>0,.28,.7)*height;
 const focalScale=.82+complexity*.24,counterScale=.42+complexity*.22,ghostScale=.28+complexity*.16;
 const wrap=mode==="band"||mode==="sleeve"||mode==="cuff"||mode==="collar";
 const frameInset=Math.max(8,Math.min(width,height)*.055),gap=Math.max(10,width*(.055+(.18-complexity*.08)));
 const defs=`<defs>
  <mask id="ascend-void"><rect width="100%" height="100%" fill="white"/><rect x="${(focalX-gap*.45).toFixed(2)}" y="0" width="${gap.toFixed(2)}" height="${height}" fill="black" rx="${(gap*.12).toFixed(2)}"/></mask>
  <clipPath id="ascend-field"><rect x="${frameInset}" y="${frameInset}" width="${Math.max(1,width-frameInset*2)}" height="${Math.max(1,height-frameInset*2)}" rx="${Math.max(3,frameInset*.25)}"/></clipPath>
 </defs>`;
 const layers:string[]=[];
 // Thread has no translucency: every "ghost" layer would be stitched solid on top of the others and the
 // stack becomes a tangle. For stitched and tooled media keep one drawing, placed once; the depth effect
 // (ghost, echo, counterpoint copies) is for print only.
 if(medium==="embroidery"||medium==="leather-tooling"){
  layers.push(`<g data-composition-layer="primary-focal" clip-path="url(#ascend-field)">${b}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-master-composition="v2-single" data-mode="${mode}" data-medium="${medium}">${defs}<g fill="none" stroke="currentColor" stroke-width="${strokeFor(medium)}" stroke-linecap="round" stroke-linejoin="round">${layers.join("")}</g></svg>`;
 }
 layers.push(`<g data-composition-layer="quiet-field" opacity=".16" clip-path="url(#ascend-field)" transform="translate(${(-width*.08).toFixed(2)} ${(height*.06).toFixed(2)}) scale(${ghostScale.toFixed(3)})">${b}</g>`);
 if(wrap)layers.push(`<g data-composition-layer="long-movement" opacity=".28" mask="url(#ascend-void)" transform="translate(${(width*.12).toFixed(2)} ${(-height*.08).toFixed(2)}) scale(1.18 .72)">${b}</g>`);
 layers.push(`<g data-composition-layer="primary-focal" transform="translate(${focalX.toFixed(2)} ${focalY.toFixed(2)}) scale(${focalScale.toFixed(3)}) translate(${(-focalX).toFixed(2)} ${(-focalY).toFixed(2)})">${b}</g>`);
 layers.push(`<g data-composition-layer="counterpoint" opacity=".72" transform="translate(${counterX.toFixed(2)} ${counterY.toFixed(2)}) scale(${counterScale.toFixed(3)}) translate(${(-counterX).toFixed(2)} ${(-counterY).toFixed(2)})">${b}</g>`);
 if(complexity>.58)layers.push(`<g data-composition-layer="secondary-detail" opacity=".46" transform="translate(${(width*.05).toFixed(2)} ${(height*.18).toFixed(2)}) scale(${(.52+complexity*.12).toFixed(3)})">${b}</g>`);
 if(complexity>.76)layers.push(`<g data-composition-layer="distant-echo" opacity=".24" transform="translate(${(width*.58).toFixed(2)} ${(height*.58).toFixed(2)}) scale(${(.31+complexity*.09).toFixed(3)}) rotate(-7 ${(width*.5).toFixed(2)} ${(height*.5).toFixed(2)})">${b}</g>`);
 const frame=mode==="field"||mode==="emblem"
  ?`<path data-composition-layer="frame" d="M${frameInset} ${height-frameInset} Q${width*.28} ${height-frameInset*1.5} ${width*.5} ${height-frameInset} T${width-frameInset} ${height-frameInset}" opacity=".35"/>`
  :`<path data-composition-layer="frame" d="M${frameInset} ${height-frameInset} H${width*.34} M${width*.48} ${height-frameInset} H${width-frameInset}" opacity=".38"/>`;
 const interruption=`<g data-composition-layer="interruption"><path d="M${(focalX-gap*.1).toFixed(2)} ${(height*.12).toFixed(2)} V${(height*.88).toFixed(2)}" opacity=".18"/></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-master-composition="v1" data-mode="${mode}" data-medium="${medium}">${defs}<g fill="none" stroke="currentColor" stroke-width="${strokeFor(medium)}" stroke-linecap="round" stroke-linejoin="round">${layers.join("")}${frame}${interruption}</g></svg>`;
}
