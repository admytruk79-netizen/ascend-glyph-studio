import {createHash} from "node:crypto";
import {PointMm} from "./product-geometry";
import {CanonicalArtwork,hashCanonicalArtwork} from "./canonical-artwork";

export interface ParsedCanonicalSvg{byteHash:string;viewBox:{x:number;y:number;width:number;height:number};polygons:PointMm[][]}
const nums=(s:string)=>s.trim().split(/[\s,]+/).filter(Boolean).map(Number);
export function parseCanonicalSvg(svg:string):ParsedCanonicalSvg{
 const vb=svg.match(/viewBox=["']([^"']+)["']/i);if(!vb)throw new Error("canonical-svg-viewbox-required");
 const v=nums(vb[1]!);if(v.length!==4||v.some(x=>!Number.isFinite(x)))throw new Error("invalid-canonical-svg-viewbox");
 const paths=[...svg.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]!);
 if(!paths.length)throw new Error("canonical-svg-path-required");
 const polygons:PointMm[][]=[];
 for(const d of paths){
  if(/[CQASTHVcqasthv]/.test(d))throw new Error("unsupported-canonical-svg-path-command");
  const tokens=d.match(/[MLZmlz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)??[];let i=0,x=0,y=0,start:PointMm|undefined,poly:PointMm[]=[];
  const flush=()=>{if(poly.length>=3)polygons.push(poly);poly=[];start=undefined};
  while(i<tokens.length){const cmd=tokens[i++]!;if(!/[MLZmlz]/.test(cmd))throw new Error("canonical-svg-command-required");
   if(cmd==="Z"||cmd==="z"){flush();continue}
   let first=true;
   while(i<tokens.length&&!/[MLZmlz]/.test(tokens[i]!)){
    const nx=Number(tokens[i++]!),ny=Number(tokens[i++]!);if(!Number.isFinite(nx)||!Number.isFinite(ny))throw new Error("invalid-canonical-svg-coordinate");
    if(cmd===cmd.toLowerCase()){x+=nx;y+=ny}else{x=nx;y=ny}
    const p={x,y};if(first&&!start)start=p;poly.push(p);first=false;
   }
  }
  flush();
 }
 if(!polygons.length)throw new Error("canonical-svg-closed-polygon-required");
 return{byteHash:createHash("sha256").update(svg).digest("hex"),viewBox:{x:v[0]!,y:v[1]!,width:v[2]!,height:v[3]!},polygons};
}
export function canonicalArtworkFromSvg(id:string,revision:string,svg:string,minLineUnits:number,minGapUnits:number):CanonicalArtwork&{byteHash:string}{
 const parsed=parseCanonicalSvg(svg);const raw={id,revision,viewBox:parsed.viewBox,polygons:parsed.polygons,minLineUnits,minGapUnits};
 return{...raw,sourceHash:hashCanonicalArtwork(raw),byteHash:parsed.byteHash};
}
