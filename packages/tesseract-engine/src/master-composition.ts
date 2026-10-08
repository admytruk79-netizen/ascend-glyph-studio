import type {MediumId} from "./medium-compiler";
import type {SashEvidenceGrammar} from "./sash-evidence-grammar";
import type {StructuralFeedback} from "./structural-feedback";
import {buildMasterCompositionPlan} from "./master-composition-plan";

export type MasterCompositionMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type MasterCompositionInput={svg:string;mode:MasterCompositionMode;complexity:number;medium:MediumId;width:number;height:number;seed:string;sashGrammar?:SashEvidenceGrammar;structuralFeedback?:StructuralFeedback};

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
 const plan=buildMasterCompositionPlan({mode,medium,complexity:input.complexity,sashGrammar:g,structuralFeedback:input.structuralFeedback});
 const p=plan.primary;
 const primary=`<g data-sash-layer="primary-focal" transform="translate(${(p.offsetX*width).toFixed(2)} ${(p.offsetY*height).toFixed(2)}) scale(${p.scaleX.toFixed(4)} ${p.scaleY.toFixed(4)})">${b}</g>`;
 const line=(x:typeof plan.auxiliaryLines[number])=>`<path data-composition-line="${x.id}" opacity="${x.opacity}" d="M${(x.x1*width).toFixed(2)} ${(x.y1*height).toFixed(2)} L${(x.x2*width).toFixed(2)} ${(x.y2*height).toFixed(2)}"/>`;
 const auxiliaries=`<g data-sash-layer="production-auxiliary">${plan.auxiliaryLines.map(line).join("")}</g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-master-composition="${plan.id}" data-mode="${mode}" data-medium="${medium}" data-source-grammar="${g.id}" data-source-doi="${g.source.doi}"><g fill="none" stroke="currentColor" stroke-width="${strokeFor(medium)}" stroke-linecap="round" stroke-linejoin="round">${primary}${auxiliaries}</g></svg>`;
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
