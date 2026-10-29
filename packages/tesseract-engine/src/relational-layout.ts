import type {Topology,TopologyNode,TopologyEdge} from "./topology";
import type {GarmentZone} from "./garment";
import {planEmergence,emergencePenalty} from "./emergence";
import {circumferenceAt} from "./garment-surface-math";

export type LayoutPoint={x:number;y:number;angleDeg:number;scale:number;layer:number};
export type Layout={points:Record<string,LayoutPoint>;iterations:number;energy:number};

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function clamp(x:number,a:number,b:number){return Math.max(a,Math.min(b,x))}
function desired(e:TopologyEdge,w:number,h:number){
 const base=Math.min(w,h);
 const map:Record<string,number>={anchor:.18,flow:.27,branch:.23,oppose:.34,intersect:.12,enclose:.16,transform:.25,terminate:.3,return:.2,ascend:.3,orbit:.2,bridge:.3,radiate:.26,repeat:.18};
 return base*(map[e.relation]??.24);
}
function orientation(e:TopologyEdge){const m:Record<string,number>={ascend:-90,flow:-72,branch:-45,oppose:0,bridge:0,return:180,orbit:25,radiate:-35};return m[e.relation]??0}

export function solveRelationalLayout(t:Topology,width:number,height:number,seed:string,zone?:GarmentZone,constraints?:{minGapMm?:number;seamPolicy?:"avoid"|"continuous"|"resolve";footprintById?:Record<string,{widthMm:number;heightMm:number;clearanceMm?:number}>}):Layout{
 const pad=Math.max(18,Math.min(width,height)*.08),pts:Record<string,LayoutPoint>={};
 const n=Math.max(1,t.nodes.length),wrap=!!zone?.wrapAllowed,emergence=planEmergence(t,seed);
 const localCirc=(y:number)=>wrap&&zone?circumferenceAt(zone,y):width;
 const radiusFor=(id:string,p:LayoutPoint)=>{
  const fp=constraints?.footprintById?.[id];
  if(!fp)return Math.min(24,height*.105)*p.scale+(constraints?.minGapMm??.8);
  return Math.hypot(fp.widthMm,fp.heightMm)/2+Math.max(constraints?.minGapMm??.8,fp.clearanceMm??0);
 };
 t.nodes.forEach((node,i)=>{const u=(i+.5)/n,j=((hash(seed+node.id)%1000)/999-.5);
   pts[node.id]={x:pad+u*(width-2*pad),y:height*(.5+j*.36),angleDeg:0,scale:.72+node.scale*.18,layer:node.form==="void"?0:node.scale};});
 let energy=0;
 for(let it=0;it<72;it++){
  energy=0;
  const force:Record<string,{x:number;y:number}>=Object.fromEntries(t.nodes.map(x=>[x.id,{x:0,y:0}]));
  for(let i=0;i<t.nodes.length;i++)for(let j=i+1;j<t.nodes.length;j++){
   const aid=t.nodes[i]!.id,bid=t.nodes[j]!.id,a=pts[aid]!,b=pts[bid]!;
   let dx=b.x-a.x,dy=b.y-a.y;
   if(wrap){const C=localCirc((a.y+b.y)/2);if(Math.abs(dx)>C/2)dx-=Math.sign(dx)*C;}
   const d=Math.max(1,Math.hypot(dx,dy));
   const min=radiusFor(aid,a)+radiusFor(bid,b);
   if(d<min){const q=(min-d)/min*.9;force[t.nodes[i]!.id]!.x-=dx/d*q;force[t.nodes[i]!.id]!.y-=dy/d*q;force[t.nodes[j]!.id]!.x+=dx/d*q;force[t.nodes[j]!.id]!.y+=dy/d*q;energy+=q;}
  }
  for(const e of t.edges){const a=pts[e.from],b=pts[e.to];if(!a||!b)continue;let dx=b.x-a.x,dy=b.y-a.y;
   if(wrap){const C=localCirc((a.y+b.y)/2);if(Math.abs(dx)>C/2)dx-=Math.sign(dx)*C;}
   const d=Math.max(1,Math.hypot(dx,dy)),target=desired(e,width,height),q=(d-target)/target*e.weight*.24;
   force[e.from]!.x+=dx/d*q;force[e.from]!.y+=dy/d*q;force[e.to]!.x-=dx/d*q;force[e.to]!.y-=dy/d*q;
   const targetAngle=orientation(e)*Math.PI/180,actual=Math.atan2(dy,dx),turn=Math.atan2(Math.sin(targetAngle-actual),Math.cos(targetAngle-actual))*.05*e.weight;
   force[e.to]!.x+=Math.cos(actual+Math.PI/2)*turn*target;force[e.to]!.y+=Math.sin(actual+Math.PI/2)*turn*target;energy+=Math.abs(q)+Math.abs(turn);
  }
  for(const node of t.nodes){const p=pts[node.id]!,f=force[node.id]!,anchor=emergence.anchors[node.id];if(anchor){const pull=(it<30?.045:.018)*anchor.weight;f.x+=(anchor.u*width-p.x)*pull;f.y+=(anchor.v*height-p.y)*pull;}
   for(const v of emergence.negativeSpace){const vx=v.u*width,vy=v.v*height,rr=v.radius*Math.min(width,height),dx=p.x-vx,dy=p.y-vy,d=Math.max(1,Math.hypot(dx,dy));if(d<rr){const q=(rr-d)/rr;f.x+=dx/d*q*2.4;f.y+=dy/d*q*2.4;}}
   const step=it<20?3.2:it<48?1.7:.7;p.x+=f.x*step;p.y+=f.y*step;
   p.y=clamp(p.y,pad,height-pad);
   const C=localCirc(p.y);
   if(wrap&&constraints?.seamPolicy!=="avoid"){p.x=((p.x%C)+C)%C}
   else{
    const edge=wrap&&constraints?.seamPolicy==="avoid"?radiusFor(node.id,p):pad;
    p.x=clamp(p.x,edge,Math.max(edge,C-edge));
   }}
 }
 // Final constructive clearance pass: coordinates leave the solver valid by construction.
 for(let pass=0;pass<96;pass++){
  let moved=false;
  for(let i=0;i<t.nodes.length;i++)for(let j=i+1;j<t.nodes.length;j++){
   const aid=t.nodes[i]!.id,bid=t.nodes[j]!.id,A=pts[aid]!,B=pts[bid]!;
   let dx=B.x-A.x;if(wrap){const C=localCirc((A.y+B.y)/2);if(Math.abs(dx)>C/2)dx-=Math.sign(dx)*C;}
   const dy=B.y-A.y,d=Math.max(.001,Math.hypot(dx,dy)),need=radiusFor(aid,A)+radiusFor(bid,B);
   if(d+1e-6>=need)continue;
   const push=(need-d)/2+.01,ux=dx/d,uy=dy/d;
   A.x-=ux*push;A.y-=uy*push;B.x+=ux*push;B.y+=uy*push;
   A.y=clamp(A.y,pad,height-pad);B.y=clamp(B.y,pad,height-pad);
   if(wrap&&constraints?.seamPolicy!=="avoid"){
    const CA=localCirc(A.y),CB=localCirc(B.y);
    A.x=((A.x%CA)+CA)%CA;B.x=((B.x%CB)+CB)%CB;
   }else{
    const edgeA=wrap&&constraints?.seamPolicy==="avoid"?radiusFor(aid,A):pad;
    const edgeB=wrap&&constraints?.seamPolicy==="avoid"?radiusFor(bid,B):pad;
    A.x=clamp(A.x,edgeA,Math.max(edgeA,localCirc(A.y)-edgeA));
    B.x=clamp(B.x,edgeB,Math.max(edgeB,localCirc(B.y)-edgeB));
   }
   moved=true;
  }
  if(!moved)break;
 }
 for(const e of t.edges){const a=pts[e.from],b=pts[e.to];if(a&&b){const ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;a.angleDeg=(a.angleDeg+ang)/2;}}
 if(wrap&&constraints?.seamPolicy==="avoid"){
  for(const node of t.nodes){
   const p=pts[node.id]!,edge=radiusFor(node.id,p),C=localCirc(p.y);
   p.x=clamp(p.x,edge,Math.max(edge,C-edge));
  }
 }
  energy+=emergencePenalty(emergence,pts,width,height)*10;
 return {points:pts,iterations:72,energy};
}
