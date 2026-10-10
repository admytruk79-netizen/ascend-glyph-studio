/** Production-facing compound motif geometry in millimetres.
 * Uses the same StitchIrObject contract as Tesseract's embroidery pipeline.
 * This is a stitch-plan intermediate representation, NOT machine digitization.
 */
import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";
import type {CompoundKind} from "./compound-ornament";
export type CompoundPlacement={id:string;kind:CompoundKind;xMm:number;yMm:number;radiusMm:number;threadColor?:string};
const pt=(x:number,y:number):StitchIrPoint=>({x,y});
const polygon=(cx:number,cy:number,r:number,n:number,offset=-Math.PI/2):StitchIrPoint[]=>Array.from({length:n+1},(_,i)=>pt(cx+Math.cos(i*2*Math.PI/n+offset)*r,cy+Math.sin(i*2*Math.PI/n+offset)*r));
const line=(id:string,color:string,path:StitchIrPoint[]):StitchIrObject=>({kind:"run",id,color,path,length:2.5});
function flower(id:string,cx:number,cy:number,r:number,color:string):StitchIrObject[]{
 const petals:StitchIrObject[]=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  const x=cx+Math.cos(a)*r*.65,y=cy+Math.sin(a)*r*.65;
  petals.push({kind:"fill",id:`${id}:petal:${i}`,color,polygon:polygon(x,y,r*.29,8),angle:i*45,rowSpacing:.43});
 }
 petals.push({kind:"fill",id:`${id}:center`,color:"#d5a553",polygon:polygon(cx,cy,r*.24,12),angle:45,rowSpacing:.43});
 return petals;
}
export function compoundMotifStitchIr(p:CompoundPlacement):StitchIrObject[]{
 const {id,kind,xMm:x,yMm:y,radiusMm:r}=p;
 if(!Number.isFinite(r)||r<12)throw new Error("Compound motif radius must be at least 12mm");
 const color=p.threadColor??"#263c5d";
 const out:StitchIrObject[]=[];
 if(kind==="branching-garden"){
  out.push(line(`${id}:stem`,color,[pt(x,y+r*.8),pt(x,y-r*.7)]));
  for(let tier=0;tier<3;tier++){
   const yy=y+r*(.4-tier*.4);
   const reach=r*(.5-tier*.07);
   for(const side of [-1,1]){
    const ex=x+side*reach,ey=yy-r*.18;
    out.push(line(`${id}:branch:${tier}:${side}`,color,[pt(x,yy),pt(x+side*reach*.5,yy-r*.15),pt(ex,ey)]));
    out.push(...flower(`${id}:flower:${tier}:${side}`,ex,ey,r*.12,"#a72f2a"));
   }
  }
  out.push(...flower(`${id}:crown`,x,y-r*.75,r*.22,"#a72f2a"));
 }else if(kind==="interlaced-rosette"){
  for(let ring=0;ring<3;ring++){
   const points=polygon(x,y,r*(.28+ring*.21),8);
   out.push(line(`${id}:ring:${ring}`,ring%2?"#a72f2a":color,points));
   for(let i=0;i<8;i++)out.push(line(`${id}:lace:${ring}:${i}`,"#d5a553",[points[i]!,points[(i+3)%8]!]));
  }
  out.push(...flower(`${id}:heart`,x,y,r*.24,"#a72f2a"));
 }else{
  for(let ring=0;ring<4;ring++){
   const d=r*(.72-ring*.15),s=d/4;
   const outline=[pt(x-d,y),pt(x-d,y-s),pt(x-d+s,y-s),pt(x-d+s,y-2*s),pt(x-d+2*s,y-2*s),pt(x-d+2*s,y-3*s),pt(x,y-3*s),pt(x,y-d),pt(x+d,y),pt(x,y+d),pt(x-d,y)];
   out.push(line(`${id}:step:${ring}`,ring%2?"#a72f2a":color,outline));
  }
  out.push(...flower(`${id}:heart`,x,y,r*.17,"#a72f2a"));
 }
 return out;
}
export function validateCompoundStitchIr(objects:StitchIrObject[],widthMm:number,heightMm:number){
 const errors:string[]=[];let count=0;
 for(const o of objects){
  const points=o.kind==="fill"?o.polygon:o.path;
  if(points.length<2)errors.push(o.id+": empty geometry");
  for(const p of points){
   count++;
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y))errors.push(o.id+": nonfinite coordinate");
   if(p.x<0||p.x>widthMm||p.y<0||p.y>heightMm)errors.push(o.id+": outside textile bounds");
  }
  if(o.kind==="fill"&&o.polygon.length<4)errors.push(o.id+": invalid fill contour");
 }
 return {valid:errors.length===0,objectCount:objects.length,pointCount:count,errors:[...new Set(errors)]};
}
