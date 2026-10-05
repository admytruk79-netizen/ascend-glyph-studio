import { CompositionPlan, PrimitiveKind } from "./grammar";
import { ProductGeometry } from "./core";
export interface VectorFeature{ruleId:string;primitive:PrimitiveKind;path:string}
export interface RenderedZone{zoneId:string;viewBox:string;features:VectorFeature[];svg:string}
const f=(n:number)=>Number(n.toFixed(2));
export function renderComposition(plan:CompositionPlan,zone:ProductGeometry):RenderedZone{
 if(plan.validation.length)throw new Error(plan.validation.join("; "));
 const w=zone.widthMm,h=zone.heightMm,s=zone.safeInsetMm,cx=w/2,cy=h/2,usableW=w-2*s,usableH=h-2*s;
 const features:VectorFeature[]=[]; const add=(ruleId:string,primitive:PrimitiveKind,path:string)=>features.push({ruleId,primitive,path});
 plan.rules.forEach((r,i)=>{const t=(i+1)/(plan.rules.length+1),y=f(s+usableH*t),dx=f(usableW*(.12+.055*i));
  if(r.primitive==="axis")add(r.id,r.primitive,`M${f(cx)} ${f(s)} V${f(h-s)}`);
  else if(r.primitive==="enclosure")add(r.id,r.primitive,`M${f(s)} ${f(s)} H${f(w-s)} V${f(h-s)} H${f(s)} Z`);
  else if(r.primitive==="step")add(r.id,r.primitive,`M${f(cx-dx)} ${y} H${f(cx)} V${f(y-8)} H${f(cx+dx)}`);
  else if(r.primitive==="branch")add(r.id,r.primitive,`M${f(cx)} ${y} L${f(cx-dx)} ${f(y-12)} M${f(cx)} ${y} L${f(cx+dx)} ${f(y-12)}`);
  else if(r.primitive==="pulse")add(r.id,r.primitive,`M${f(cx-dx)} ${y} L${f(cx-dx/2)} ${f(y-6)} L${f(cx)} ${y} L${f(cx+dx/2)} ${f(y+6)} L${f(cx+dx)} ${y}`);
  else if(r.primitive==="chevron")add(r.id,r.primitive,`M${f(cx-dx)} ${f(y+7)} L${f(cx)} ${f(y-7)} L${f(cx+dx)} ${f(y+7)}`);
  else if(r.primitive==="arc")add(r.id,r.primitive,`M${f(cx-dx)} ${y} Q${f(cx)} ${f(y-12)} ${f(cx+dx)} ${y}`);
  else if(r.primitive==="band")add(r.id,r.primitive,`M${f(s)} ${f(y-3)} H${f(w-s)} M${f(s)} ${f(y+3)} H${f(w-s)}`);
  else if(r.primitive==="lattice")add(r.id,r.primitive,`M${f(cx-dx)} ${f(y-8)} L${f(cx+dx)} ${f(y+8)} M${f(cx-dx)} ${f(y+8)} L${f(cx+dx)} ${f(y-8)}`);
  else if(r.primitive==="meander")add(r.id,r.primitive,`M${f(cx-dx)} ${y} H${f(cx-dx/2)} V${f(y-7)} H${f(cx+dx/2)} V${f(y+7)} H${f(cx+dx)}`);
  else if(r.primitive==="rosette"){const rad=f(Math.min(dx,Math.min(w,h)*.12));add(r.id,r.primitive,`M${f(cx-rad)} ${y} A${rad} ${rad} 0 1 0 ${f(cx+rad)} ${y} A${rad} ${rad} 0 1 0 ${f(cx-rad)} ${y}`);}
 });
 const body=features.map(x=>`<path data-rule="${x.ruleId}" d="${x.path}"/>`).join("");
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="0.6" stroke-linecap="square" stroke-linejoin="miter"><g>${body}</g></svg>`;
 return{zoneId:zone.id,viewBox:`0 0 ${w} ${h}`,features,svg};
}
