import {primitiveForForm} from "./ascend-primitives";
import type {ProductionGlyphObject} from "./production-object";

export type StitchIrPoint={x:number;y:number};
export type StitchIrObject=
 |{kind:"run";id:string;color:string;path:StitchIrPoint[];triple?:boolean;length?:number}
 |{kind:"satin";id:string;color:string;path:StitchIrPoint[];width:number;spacing?:number}
 |{kind:"fill";id:string;color:string;polygon:StitchIrPoint[];angle?:number;rowSpacing?:number};

const NUM=/[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;
const TOK=/[MLHVQCZmlhvqcz]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function cubic(a:StitchIrPoint,b:StitchIrPoint,c:StitchIrPoint,d:StitchIrPoint,t:number):StitchIrPoint{
 const u=1-t;
 return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
}
function quad(a:StitchIrPoint,b:StitchIrPoint,c:StitchIrPoint,t:number):StitchIrPoint{
 const u=1-t;
 return {x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y};
}

export function sampleSvgPath(d:string,curveSteps=10):StitchIrPoint[]{
 const tokens=d.match(TOK)??[];
 let i=0,cmd="",cur={x:0,y:0},start={x:0,y:0};
 const out:StitchIrPoint[]=[];
 const num=()=>Number(tokens[i++]!);
 const point=(rel:boolean,x:number,y:number)=>rel?{x:cur.x+x,y:cur.y+y}:{x,y};
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i]!))cmd=tokens[i++]!;
  if(!cmd)break;
  const rel=cmd===cmd.toLowerCase(),op=cmd.toUpperCase();
  if(op==="M"){
   const p=point(rel,num(),num());cur=p;start={...p};out.push({...p});cmd=rel?"l":"L";
  }else if(op==="L"){
   const p=point(rel,num(),num());cur=p;out.push({...p});
  }else if(op==="H"){
   const x=num();cur={x:rel?cur.x+x:x,y:cur.y};out.push({...cur});
  }else if(op==="V"){
   const y=num();cur={x:cur.x,y:rel?cur.y+y:y};out.push({...cur});
  }else if(op==="C"){
   const c1=point(rel,num(),num()),c2=point(rel,num(),num()),p=point(rel,num(),num()),a={...cur};
   for(let s=1;s<=curveSteps;s++)out.push(cubic(a,c1,c2,p,s/curveSteps));
   cur=p;
  }else if(op==="Q"){
   const c1=point(rel,num(),num()),p=point(rel,num(),num()),a={...cur};
   for(let s=1;s<=curveSteps;s++)out.push(quad(a,c1,p,s/curveSteps));
   cur=p;
  }else if(op==="Z"){
   if(out.length&&(out.at(-1)!.x!==start.x||out.at(-1)!.y!==start.y))out.push({...start});
   cur={...start};cmd="";
  }else break;
 }
 return out;
}

function transform(points:StitchIrPoint[],o:ProductionGlyphObject):StitchIrPoint[]{
 const cx=o.placement.xMm??0,cy=o.placement.yMm??0,w=o.physical.widthMm,h=o.physical.heightMm;
 const ang=((o.placement.rotationDeg??o.physical.rotationDeg??0)*Math.PI)/180,co=Math.cos(ang),si=Math.sin(ang);
 return points.map(p=>{
  const x=(p.x-50)*(w/100),y=(p.y-50)*(h/100);
  return {x:cx+x*co-y*si,y:cy+x*si+y*co};
 });
}

function fallback(o:ProductionGlyphObject):StitchIrPoint[]{
 const w=o.physical.widthMm,h=o.physical.heightMm;
 return transform([{x:25,y:75},{x:50,y:25},{x:75,y:75}],o);
}

/**
 * Neutral stitch IR compiled from the same ASCEND primitive geometry used by
 * the preview. The stitch-engine can consume this structure directly because
 * it matches its run/satin/fill object contract.
 */
export function compileProductionObjectsToStitchIr(objects:ProductionGlyphObject[]):StitchIrObject[]{
 const out:StitchIrObject[]=[];
 for(const o of objects){
  const primitive=primitiveForForm(o.form);
  const paths=(primitive?.paths??[]).map(d=>sampleSvgPath(d)).filter(p=>p.length>=2);
  const geometry=paths.length?paths:[fallback(o)];
  geometry.forEach((raw,j)=>{
   const pts=paths.length?transform(raw,o):raw;
   const id=`${o.id}:p${j}`;
   const e=o.embroidery;
   if(e.stitchFamily==="satin"){
    out.push({kind:"satin",id,color:o.threadColor,path:pts,width:e.satinWidthMm??Math.max(1,o.physical.widthMm*.08),spacing:e.spacingMm});
   }else if(e.stitchFamily==="fill"){
    const poly=[...pts];
    if(poly.length>=3){
     const a=poly[0]!,b=poly.at(-1)!;
     if(a.x!==b.x||a.y!==b.y)poly.push({...a});
     out.push({kind:"fill",id,color:o.threadColor,polygon:poly,angle:e.fillAngleDeg,rowSpacing:e.spacingMm});
    }
   }else{
    out.push({kind:"run",id,color:o.threadColor,path:pts,length:e.runLengthMm??e.spacingMm});
   }
  });
 }
 return out;
}
