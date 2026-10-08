import {primitiveForForm} from "./ascend-primitives";
import type {ProductionGlyphObject} from "./production-object";
import type {MasterCompositionPlan} from "./master-composition-plan";

export type StitchIrPoint={x:number;y:number};
export type StitchIrObject=
 |{kind:"run";id:string;color:string;path:StitchIrPoint[];triple?:boolean;length?:number}
 |{kind:"satin";id:string;color:string;path:StitchIrPoint[];width:number;spacing?:number}
 |{kind:"fill";id:string;color:string;polygon:StitchIrPoint[];angle?:number;rowSpacing?:number};

const TOK=/[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;
const SUPPORTED=/^[MLHVQCZmlhvqcz]$/;
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
 if(tokens.join("")!==d.replace(/[\s,]+/g,""))throw new Error("invalid SVG path syntax");
 if(tokens.some(t=>/^[a-zA-Z]$/.test(t)&&!SUPPORTED.test(t)))throw new Error("unsupported SVG path command");
 let i=0,cmd="",cur={x:0,y:0},start={x:0,y:0};
 const out:StitchIrPoint[]=[];
 let contours=0;
 const num=()=>{const token=tokens[i++];if(token===undefined||/^[a-zA-Z]$/.test(token))throw new Error("incomplete SVG path command");const value=Number(token);if(!Number.isFinite(value))throw new Error("non-finite SVG path coordinate");return value;};
 const point=(rel:boolean,x:number,y:number)=>rel?{x:cur.x+x,y:cur.y+y}:{x,y};
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i]!))cmd=tokens[i++]!;
  if(!cmd)throw new Error("SVG path requires an explicit command");
  const rel=cmd===cmd.toLowerCase(),op=cmd.toUpperCase();
  if(op==="M"){
   if(++contours>1)throw new Error("multiple SVG contours require separate stitch objects");
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
  }else throw new Error("unsupported SVG path command");
 }
 if(out.length<2)throw new Error("SVG path has insufficient geometry");
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

/**
 * Neutral stitch IR compiled from the same ASCEND primitive geometry used by
 * the preview. The stitch-engine can consume this structure directly because
 * it matches its run/satin/fill object contract.
 */
export function compileProductionObjectsToStitchIr(objects:ProductionGlyphObject[]):StitchIrObject[]{
 const out:StitchIrObject[]=[];
 for(const o of objects){
  const primitive=primitiveForForm(o.form);
  if(!primitive?.paths.length)throw new Error("missing ASCEND source geometry: "+o.id+" ("+o.form+")");
  const geometry=primitive.paths.map(d=>sampleSvgPath(d));
  geometry.forEach((raw,j)=>{
   const pts=transform(raw,o);
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


export function applyMasterCompositionToStitchIr(
 objects:StitchIrObject[],
 plan:MasterCompositionPlan,
 widthMm:number,
 heightMm:number,
 color="#111111"
):StitchIrObject[]{
 const p=plan.primary;
 const mapPoint=(q:StitchIrPoint):StitchIrPoint=>({
  x:p.offsetX*widthMm+q.x*p.scaleX,
  y:p.offsetY*heightMm+q.y*p.scaleY
 });
 const primary=objects.map(o=>{
  if(o.kind==="fill")return {...o,polygon:o.polygon.map(mapPoint)};
  return {...o,path:o.path.map(mapPoint)};
 });
 const auxiliary:StitchIrObject[]=plan.auxiliaryLines.map(x=>({
  kind:"run" as const,id:`composition:${x.id}`,color,
  path:[{x:x.x1*widthMm,y:x.y1*heightMm},{x:x.x2*widthMm,y:x.y2*heightMm}],
  length:2.5
 }));
 return [...primary,...auxiliary];
}


export type StitchIrFootprint={
 id:string;u:number;v:number;widthMm:number;heightMm:number;rotationDeg:number;clearanceMm:number;
};

/**
 * Derive physical surface footprints from the FINAL stitch IR after master
 * composition. This keeps surface validation aligned with what will actually
 * be digitized instead of measuring the pre-composition semantic skeleton.
 */
export function stitchIrFootprints(objects:StitchIrObject[],clearanceMm:number):StitchIrFootprint[]{
 const groups=new Map<string,StitchIrObject[]>();
 for(const o of objects){
  // Primitive paths are emitted as <glyph-id>:pN. Group them back into the
  // authoritative production glyph. Composition helpers intentionally remain
  // separate because their IDs do not use the :pN suffix.
  const id=o.id.replace(/:p\d+$/,"");
  const row=groups.get(id)??[];row.push(o);groups.set(id,row);
 }
 const out:StitchIrFootprint[]=[];
 for(const [id,group] of groups){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,stroke=0;
  for(const o of group){
   const pts=o.kind==="fill"?o.polygon:o.path;
   if(!pts.length)throw new Error("stitch IR object has no geometry: "+o.id);
   stroke=Math.max(stroke,o.kind==="satin"?o.width:o.kind==="run"?.5:0);
   for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
  }
  const widthMm=Math.max(.1,maxX-minX+stroke),heightMm=Math.max(.1,maxY-minY+stroke);
  out.push({id,u:(minX+maxX)/2,v:(minY+maxY)/2,widthMm,heightMm,rotationDeg:0,clearanceMm:id.startsWith("composition:")?0:clearanceMm});
 }
 return out;
}
