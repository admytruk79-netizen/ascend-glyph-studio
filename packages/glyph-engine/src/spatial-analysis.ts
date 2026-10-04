import { RenderedZone } from "./renderer";
export interface SpatialMetrics{marginSafety:number;symmetry:number;intervalConsistency:number;centerBias:number;distribution:number;score:number}
type Pt={x:number;y:number};const nums=(s:string)=>(s.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
function pts(z:RenderedZone):Pt[]{const out:Pt[]=[];for(const f of z.features){const n=nums(f.path);for(let i=0;i+1<n.length;i+=2)out.push({x:n[i],y:n[i+1]})}return out}
const clamp=(x:number)=>Math.max(0,Math.min(1,x)),mean=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
export function analyzeSpatial(z:RenderedZone,width:number,height:number,safeInset:number):SpatialMetrics{
 const p=pts(z);if(!p.length)return{marginSafety:0,symmetry:0,intervalConsistency:0,centerBias:0,distribution:0,score:0};
 const safe=p.filter(q=>q.x>=safeInset&&q.x<=width-safeInset&&q.y>=safeInset&&q.y<=height-safeInset).length/p.length;
 const cx=width/2,mirrorErr=mean(p.map(q=>{let best=Infinity;for(const r of p)best=Math.min(best,Math.hypot((width-r.x)-q.x,r.y-q.y));return best/Math.max(width,height)}));
 const symmetry=clamp(1-mirrorErr*8),centerBias=clamp(1-Math.abs(mean(p.map(q=>q.x))-cx)/(width/2));
 const ys=[...new Set(p.map(q=>Number(q.y.toFixed(2))))].sort((a,b)=>a-b),gaps=ys.slice(1).map((y,i)=>y-ys[i]);const gm=mean(gaps),variance=mean(gaps.map(g=>(g-gm)**2));
 const intervalConsistency=gaps.length<2?1:clamp(1-Math.sqrt(variance)/(gm||1));
 const quadrants=[0,0,0,0];for(const q of p)quadrants[(q.x>=cx?1:0)+(q.y>=height/2?2:0)]++;const target=p.length/4,distribution=clamp(1-mean(quadrants.map(n=>Math.abs(n-target)))/(target||1));
 const score=clamp(safe*.25+symmetry*.2+intervalConsistency*.2+centerBias*.15+distribution*.2);
 return{marginSafety:Number(safe.toFixed(4)),symmetry:Number(symmetry.toFixed(4)),intervalConsistency:Number(intervalConsistency.toFixed(4)),centerBias:Number(centerBias.toFixed(4)),distribution:Number(distribution.toFixed(4)),score:Number(score.toFixed(4))}
}
