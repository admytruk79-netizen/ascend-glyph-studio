import {createHash} from "node:crypto";
import {PointMm} from "./product-geometry";
import {ArtworkPlacement} from "./universal-preflight";

export interface CanonicalCompoundPath{fillRule:"nonzero"|"evenodd";rings:PointMm[][]}
export interface CanonicalArtwork{
 id:string;revision:string;sourceHash:string;viewBox:{x:number;y:number;width:number;height:number};
 polygons:PointMm[][];compoundPaths?:CanonicalCompoundPath[];minLineUnits:number;minGapUnits:number;
}
export interface ArtworkProjection{
 artworkId:string;artworkRevision:string;canonicalSourceHash:string;transformHash:string;placement:ArtworkPlacement;
}
export interface ProjectionInput{
 zoneId:string;xMm:number;yMm:number;widthMm:number;heightMm:number;registrationDemandMm?:number;
}
const stable=(v:unknown):string=>Array.isArray(v)?"["+v.map(stable).join(",")+"]":v&&typeof v==="object"?"{"+Object.entries(v as Record<string,unknown>).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+":"+stable(x)).join(",")+"}":JSON.stringify(v);
export function hashCanonicalArtwork(a:Omit<CanonicalArtwork,"sourceHash">){
 return createHash("sha256").update(stable(a)).digest("hex");
}
export function validateCanonicalArtwork(a:CanonicalArtwork):string[]{
 const e:string[]=[];if(!a.id.trim()||!a.revision.trim())e.push("missing-artwork-identity");
 if(a.viewBox.width<=0||a.viewBox.height<=0)e.push("invalid-artwork-viewbox");
 if(!a.polygons.length||a.polygons.some(p=>p.length<3))e.push("invalid-artwork-polygons");
 if(a.compoundPaths?.some(p=>!p.rings.length||p.rings.some(r=>r.length<3)))e.push("invalid-artwork-compound-paths");
 if(a.polygons.flat().some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||a.compoundPaths?.flatMap(p=>p.rings).flat().some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))e.push("non-finite-artwork-geometry");
 // compoundPaths only when present: an absent field must hash like it did when the artwork was created
 const raw={id:a.id,revision:a.revision,viewBox:a.viewBox,polygons:a.polygons,...(a.compoundPaths!==undefined?{compoundPaths:a.compoundPaths}:{}),minLineUnits:a.minLineUnits,minGapUnits:a.minGapUnits};if(a.sourceHash!==hashCanonicalArtwork(raw))e.push("canonical-source-hash-mismatch");
 return e;
}
export function projectCanonicalArtwork(a:CanonicalArtwork,p:ProjectionInput):ArtworkProjection{
 const errors=validateCanonicalArtwork(a);if(errors.length)throw new Error(errors.join(","));
 if(p.widthMm<=0||p.heightMm<=0)throw new Error("invalid-projection-size");
 const sx=p.widthMm/a.viewBox.width,sy=p.heightMm/a.viewBox.height;
 const tx=(q:PointMm):PointMm=>({x:p.xMm+(q.x-a.viewBox.x)*sx,y:p.yMm+(q.y-a.viewBox.y)*sy});
 const polygons=a.polygons.map(poly=>poly.map(tx)),bounds=polygons.flat();
 const transform={zoneId:p.zoneId,xMm:p.xMm,yMm:p.yMm,widthMm:p.widthMm,heightMm:p.heightMm,sx,sy};
 return{artworkId:a.id,artworkRevision:a.revision,canonicalSourceHash:a.sourceHash,transformHash:createHash("sha256").update(stable(transform)).digest("hex"),placement:{id:a.id,zoneId:p.zoneId,bounds,minLineMm:a.minLineUnits*Math.min(sx,sy),minGapMm:a.minGapUnits*Math.min(sx,sy),registrationDemandMm:p.registrationDemandMm}};
}
