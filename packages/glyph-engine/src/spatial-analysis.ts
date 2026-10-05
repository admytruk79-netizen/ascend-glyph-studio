import { RenderedZone } from "./renderer";
export interface SpatialMetrics{marginSafety:number;symmetry:number;intervalConsistency:number;centerBias:number;distribution:number;directionality:number;edgePressure:number;score:number}
type Pt={x:number;y:number};const clamp=(x:number)=>Math.max(0,Math.min(1,x)),mean=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const token=/[MLHVQAZ]|-?\d+(?:\.\d+)?/gi;
function pathPoints(path:string):Pt[]{const t=path.match(token)??[],out:Pt[]=[];let i=0,x=0,y=0,cmd="";while(i<t.length){if(/^[A-Z]$/i.test(t[i])){cmd=t[i++].toUpperCase();continue}const n=()=>Number(t[i++]);if(cmd==="M"||cmd==="L"){x=n();y=n();out.push({x,y})}else if(cmd==="H"){x=n();out.push({x,y})}else if(cmd==="V"){y=n();out.push({x,y})}else if(cmd==="Q"){const cx=n(),cy=n();x=n();y=n();out.push({x:cx,y:cy},{x,y})}else if(cmd==="A"){n();n();n();n();n();x=n();y=n();out.push({x,y})}else i++}return out}
function pts(z:RenderedZone):Pt[]{return z.features.flatMap(f=>pathPoints(f.path))}
export function analyzeSpatial(z:RenderedZone,width:number,height:number,safeInset:number):SpatialMetrics{
 const p=pts(z);if(!p.length)return{marginSafety:0,symmetry:0,intervalConsistency:0,centerBias:0,distribution:0,directionality:0,edgePressure:1,score:0};
 const safe=p.filter(q=>q.x>=safeInset&&q.x<=width-safeInset&&q.y>=safeInset&&q.y<=height-safeInset).length/p.length,cx=width/2,cy=height/2;
 const mirrorErr=mean(p.map(q=>Math.min(...p.map(r=>Math.hypot((width-r.x)-q.x,r.y-q.y)))))/Math.max(width,height),symmetry=clamp(1-mirrorErr*8);
 const centerBias=clamp(1-Math.hypot(mean(p.map(q=>q.x))-cx,mean(p.map(q=>q.y))-cy)/Math.hypot(cx,cy));
 const ys=[...new Set(p.map(q=>Number(q.y.toFixed(2))))].sort((a,b)=>a-b),gaps=ys.slice(1).map((y,i)=>y-(ys[i]??y)),gm=mean(gaps),variance=mean(gaps.map(g=>(g-gm)**2)),intervalConsistency=gaps.length<2?1:clamp(1-Math.sqrt(variance)/(gm||1));
 const quadrants=[0,0,0,0];for(const q of p)quadrants[(q.x>=cx?1:0)+(q.y>=cy?2:0)]++;const target=p.length/4,distribution=clamp(1-mean(quadrants.map(n=>Math.abs(n-target)))/(target||1));
 const dx=Math.max(...p.map(q=>q.x))-Math.min(...p.map(q=>q.x)),dy=Math.max(...p.map(q=>q.y))-Math.min(...p.map(q=>q.y)),directionality=clamp(Math.abs(dx-dy)/Math.max(dx,dy,1));
 const edgePressure=1-safe,score=clamp(safe*.25+symmetry*.18+intervalConsistency*.18+centerBias*.14+distribution*.15+(1-edgePressure)*.1);
 return{marginSafety:Number(safe.toFixed(4)),symmetry:Number(symmetry.toFixed(4)),intervalConsistency:Number(intervalConsistency.toFixed(4)),centerBias:Number(centerBias.toFixed(4)),distribution:Number(distribution.toFixed(4)),directionality:Number(directionality.toFixed(4)),edgePressure:Number(edgePressure.toFixed(4)),score:Number(score.toFixed(4))}
}