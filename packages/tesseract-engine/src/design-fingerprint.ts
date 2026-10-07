import type {VisualFeatureVector} from "./visual-features";
import {visualDistance} from "./visual-features";
import {analyzeSvgStructure} from "./svg-analysis";

export type DesignFingerprint={hash:string;vector:VisualFeatureVector;signature:number[]};
function hash32(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,"0")}
export function fingerprintSvg(svg:string):DesignFingerprint{
 const analysis=analyzeSvgStructure(svg),v=analysis.vector;
 const keys=Object.keys(v) as (keyof VisualFeatureVector)[];
 const signature=keys.map(k=>Math.round(v[k]*1000)/1000);
 return {hash:hash32(signature.join("|")),vector:v,signature};
}
export function fingerprintDistance(a:DesignFingerprint,b:DesignFingerprint){return visualDistance(a.vector,b.vector)}
export function selectVisuallyDiverse<T extends {svg:string;score:number}>(items:T[],limit:number,minDistance=.115){
 const selected:{item:T;fp:DesignFingerprint}[]=[];
 for(const item of [...items].sort((a,b)=>b.score-a.score)){
  const fp=fingerprintSvg(item.svg);
  if(selected.every(x=>fingerprintDistance(fp,x.fp)>=minDistance))selected.push({item,fp});
  if(selected.length>=limit)break;
 }
 if(selected.length<limit){
  for(const item of [...items].sort((a,b)=>b.score-a.score)){
   if(selected.some(x=>x.item===item))continue;
   selected.push({item,fp:fingerprintSvg(item.svg)});
   if(selected.length>=limit)break;
  }
 }
 return selected.map(x=>x.item);
}
