import {PointMm} from "./product-geometry";
const EPS=1e-9;
const orient=(a:PointMm,b:PointMm,c:PointMm)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a:PointMm,b:PointMm,p:PointMm)=>Math.abs(orient(a,b,p))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS;
export function segmentsIntersect(a:PointMm,b:PointMm,c:PointMm,d:PointMm){
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
 return(o1*o2<-EPS&&o3*o4<-EPS)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);
}
export function pointInPolygon(p:PointMm,poly:PointMm[]){
 if(poly.some((a,i)=>onSegment(a,poly[(i+1)%poly.length]!,p)))return true;
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i]!,b=poly[j]!;
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
export function polygonsIntersect(a:PointMm[],b:PointMm[]){
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)if(segmentsIntersect(a[i]!,a[(i+1)%a.length]!,b[j]!,b[(j+1)%b.length]!))return true;
 return a.some(p=>pointInPolygon(p,b))||b.some(p=>pointInPolygon(p,a));
}
const distPointSegment=(p:PointMm,a:PointMm,b:PointMm)=>{
 const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2<EPS)return Math.hypot(p.x-a.x,p.y-a.y);
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),x=a.x+t*dx,y=a.y+t*dy;return Math.hypot(p.x-x,p.y-y);
};
export function polygonDistance(a:PointMm[],b:PointMm[]){
 if(polygonsIntersect(a,b))return 0;
 let d=Infinity;
 for(const p of a)for(let j=0;j<b.length;j++)d=Math.min(d,distPointSegment(p,b[j]!,b[(j+1)%b.length]!));
 for(const p of b)for(let j=0;j<a.length;j++)d=Math.min(d,distPointSegment(p,a[j]!,a[(j+1)%a.length]!));
 return d;
}
export function polygonInsideWithClearance(inner:PointMm[],outer:PointMm[],clearance:number){
 if(!inner.every(p=>pointInPolygon(p,outer)))return false;
 for(const p of inner)for(let j=0;j<outer.length;j++)if(distPointSegment(p,outer[j]!,outer[(j+1)%outer.length]!)+EPS<clearance)return false;
 return true;
}
export function polygonArea(poly:PointMm[]){let s=0;for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!;s+=a.x*b.y-b.x*a.y}return Math.abs(s)/2}
