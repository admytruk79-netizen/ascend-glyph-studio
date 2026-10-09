/**
 * Constraint-aware ornament refinement.
 * Combines deterministic simulated annealing, periodic seam distance (wrapped
 * surfaces), topology springs and collision-aware packing.
 * Coordinates are millimetres; no source glyph geometry is modified.
 */
import type {Topology} from "./topology";
import type {GarmentZone} from "./garment";
import type {Layout,LayoutPoint} from "./relational-layout";

export interface RefineOptions {
  minGapMm?:number;
  iterations?:number;
  symmetry?:"none"|"mirror-y";
  seamPolicy?:"avoid"|"continuous"|"resolve";
}
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
function rng(seed:string){let s=hash(seed)||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function wrapDelta(dx:number,w:number){return dx-Math.round(dx/w)*w;}
function angleDist(a:number,b:number){return Math.abs(((a-b+540)%360)-180);}
function measure(t:Topology,pts:Record<string,LayoutPoint>,w:number,h:number,wrap:boolean,gap:number,symmetry:string,base:Record<string,LayoutPoint>){
 let cost=0;
 for(let i=0;i<t.nodes.length;i++){
  const a=t.nodes[i]!,p=pts[a.id]!,p0=base[a.id]!;
  const rad=Math.min(24,h*.105)*p.scale;
  if(!wrap&&(p.x<rad+gap||p.x>w-rad-gap))cost+=200;
  if(p.y<rad+gap||p.y>h-rad-gap)cost+=200;
  const dx=wrap?wrapDelta(p.x-p0.x,w):p.x-p0.x;
  cost+=.003*(dx*dx+(p.y-p0.y)**2)+.0006*angleDist(p.angleDeg,p0.angleDeg)**2;
  for(let j=i+1;j<t.nodes.length;j++){
   const b=t.nodes[j]!,q=pts[b.id]!;
   const ux=wrap?wrapDelta(p.x-q.x,w):p.x-q.x;
   const d=Math.hypot(ux,p.y-q.y);
   const required=rad+Math.min(24,h*.105)*q.scale+gap;
   if(d<required)cost+=15*(required-d)**2;
  }
 }
 for(const e of t.edges){
  const p=pts[e.from],q=pts[e.to];if(!p||!q)continue;
  const bp=base[e.from],bq=base[e.to];if(!bp||!bq)continue;
  const dx=wrap?wrapDelta(q.x-p.x,w):q.x-p.x;
  const bdx=wrap?wrapDelta(bq.x-bp.x,w):bq.x-bp.x;
  const length=Math.hypot(dx,q.y-p.y),original=Math.hypot(bdx,bq.y-bp.y);
  cost+=.05*e.weight*(length-original)**2;
  if(e.relation==="nest"||e.relation==="enclose")cost+=.08*e.weight*length**2;
 }
 if(symmetry==="mirror-y"){
  for(let i=0;i<Math.floor(t.nodes.length/2);i++){
   const a=pts[t.nodes[i]!.id]!,b=pts[t.nodes[t.nodes.length-1-i]!.id]!;
   const dx=wrap?wrapDelta(a.x-(w-b.x),w):a.x-(w-b.x);
   cost+=.015*(dx*dx+(a.y-b.y)**2);
  }
 }
 return cost;
}
export function refineOrnamentalLayout(
 t:Topology,layout:Layout,w:number,h:number,seed:string,
 zone?:GarmentZone,options:RefineOptions={}
):Layout{
 if(t.nodes.length<2||w<=0||h<=0)return layout;
 const random=rng(seed+":ornament"),wrap=!!zone?.wrapAllowed&&options.seamPolicy!=="avoid";
 const gap=Math.max(0,options.minGapMm??.8),radius=Math.min(24,h*.105);
 const base:Record<string,LayoutPoint>=Object.fromEntries(Object.entries(layout.points).map(([id,p])=>[id,{...p}]));
 const pts:Record<string,LayoutPoint>=Object.fromEntries(Object.entries(layout.points).map(([id,p])=>[id,{...p}]));
 let cost=measure(t,pts,w,h,wrap,gap,options.symmetry??"none",base);
 const count=clamp(Math.floor(options.iterations??320),0,3000),nodes=t.nodes;
 for(let i=0;i<count;i++){
  const node=nodes[Math.floor(random()*nodes.length)]!,p=pts[node.id]!;
  const old={...p},temp=Math.max(.05,4*(1-i/Math.max(1,count)));
  const step=Math.min(w,h)*(.04*(1-i/Math.max(1,count))+.002);
  p.x+= (random()*2-1)*step;p.y+=(random()*2-1)*step;
  // Rotate glyph instances freely, but retain 15-degree manufacturable increments.
  if(random()<.35)p.angleDeg=Math.round((p.angleDeg+(random()<.5?-15:15))/15)*15;
  const margin=radius*p.scale+gap;
  p.x=wrap?((p.x%w)+w)%w:clamp(p.x,margin,Math.max(margin,w-margin));
  p.y=clamp(p.y,margin,Math.max(margin,h-margin));
  const next=measure(t,pts,w,h,wrap,gap,options.symmetry??"none",base);
  if(next<=cost||random()<Math.exp((cost-next)/temp)){cost=next;}
  else Object.assign(p,old);
 }
 return {points:pts,iterations:layout.iterations+count,energy:cost};
}
