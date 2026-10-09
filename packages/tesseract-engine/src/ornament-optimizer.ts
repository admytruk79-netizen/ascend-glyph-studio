/**
 * Constraint-aware ornament refinement.
 * Combines deterministic simulated annealing, periodic seam distance (wrapped
 * surfaces), topology springs and collision-aware packing.
 * Coordinates are millimetres; no source glyph geometry is modified.
 */
import type {Topology} from "./topology";
import type {GarmentZone} from "./garment";
import type {Layout,LayoutPoint} from "./relational-layout";
import {insideZone,nestedRotated,overlapsRotated,rotatedExtents,type RectPose} from "./rotated-footprints";

export interface RefineOptions {
  minGapMm?:number;
  iterations?:number;
  symmetry?:"none"|"mirror-y";
  seamPolicy?:"avoid"|"continuous"|"resolve";
  minScale?:number;
  strictGeometry?:boolean;
  maxScale?:number;
  physicalFootprints?:Record<string,{widthMm:number;heightMm:number;originalScale:number}>;
}
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
function rng(seed:string){let s=hash(seed)||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function wrapDelta(dx:number,w:number){return dx-Math.round(dx/w)*w;}
function angleDist(a:number,b:number){return Math.abs(((a-b+540)%360)-180);}
function physicalRadius(id:string,p:LayoutPoint,h:number,footprints?:RefineOptions["physicalFootprints"]){
 const f=footprints?.[id];
 return f?Math.hypot(f.widthMm,f.heightMm)*.5*(p.scale/Math.max(.001,f.originalScale)):Math.min(24,h*.105)*p.scale;
}
function pose(id:string,p:LayoutPoint,footprints:RefineOptions["physicalFootprints"]):RectPose|undefined {
 const f=footprints?.[id];
 if(!f)return undefined;
 const scale=p.scale/Math.max(.001,f.originalScale);
 return {x:p.x,y:p.y,width:f.widthMm*scale,height:f.heightMm*scale,angleDeg:p.angleDeg};
}
function measure(t:Topology,pts:Record<string,LayoutPoint>,w:number,h:number,wrap:boolean,gap:number,symmetry:string,base:Record<string,LayoutPoint>,footprints?:RefineOptions["physicalFootprints"]){
 let cost=0;
 for(let i=0;i<t.nodes.length;i++){
  const a=t.nodes[i]!,p=pts[a.id]!,p0=base[a.id]!;
  const rad=physicalRadius(a.id,p,h,footprints);
  const pp=pose(a.id,p,footprints);
  if(pp){
   if(!insideZone(pp,w,h,gap,wrap))cost+=200;
  }else{
   if(!wrap&&(p.x<rad+gap||p.x>w-rad-gap))cost+=200;
   if(p.y<rad+gap||p.y>h-rad-gap)cost+=200;
  }
  const dx=wrap?wrapDelta(p.x-p0.x,w):p.x-p0.x;
  cost+=.003*(dx*dx+(p.y-p0.y)**2)+.0006*angleDist(p.angleDeg,p0.angleDeg)**2;
  for(let j=i+1;j<t.nodes.length;j++){
   const b=t.nodes[j]!,q=pts[b.id]!;
   const ux=wrap?wrapDelta(p.x-q.x,w):p.x-q.x;
   const d=Math.hypot(ux,p.y-q.y);
   const qr=physicalRadius(b.id,q,h,footprints);
   const required=rad+qr+gap;
   const nested=t.edges.some(e=>((e.from===a.id&&e.to===b.id)||(e.from===b.id&&e.to===a.id))&&(e.relation==="nest"||e.relation==="enclose"));
   // Containment is not a collision: fit the small glyph inside the large one.
   const qp=pose(b.id,q,footprints);
   if(pp&&qp){
    if(nested){
     const big=pp.width*pp.height>=qp.width*qp.height?pp:qp,small=big===pp?qp:pp;
     if(!nestedRotated(big,small,gap,wrap?w:undefined))cost+=600;
    }else if(overlapsRotated(pp,qp,gap,wrap?w:undefined))cost+=600;
   }else if(nested){
    const big=Math.max(rad,qr),small=Math.min(rad,qr);
    const overflow=Math.max(0,d+small+gap-big);cost+=30*overflow*overflow;
   }else if(d<required)cost+=15*(required-d)**2;
  }
 }
 for(const e of t.edges){
  const p=pts[e.from],q=pts[e.to];if(!p||!q)continue;
  const bp=base[e.from],bq=base[e.to];if(!bp||!bq)continue;
  const dx=wrap?wrapDelta(q.x-p.x,w):q.x-p.x;
  const bdx=wrap?wrapDelta(bq.x-bp.x,w):bq.x-bp.x;
  const length=Math.hypot(dx,q.y-p.y),original=Math.hypot(bdx,bq.y-bp.y);
  cost+=.05*e.weight*(length-original)**2;
  if(e.relation==="nest"||e.relation==="enclose"){const a=pts[e.from]!,b=pts[e.to]!;const big=Math.max(a.scale,b.scale),small=Math.min(a.scale,b.scale);cost+=.1*e.weight*length**2+20*Math.max(0,small-big*.65)**2;}
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
function geometryError(t:Topology,pts:Record<string,LayoutPoint>,w:number,h:number,wrap:boolean,gap:number,footprints?:RefineOptions["physicalFootprints"]):string|undefined {
 const nodes=t.nodes;
 for(let i=0;i<nodes.length;i++){
  const a=nodes[i]!,p=pts[a.id],ra=p?physicalRadius(a.id,p,h,footprints):NaN;
  if(!p||!Number.isFinite(p.x+p.y+p.scale+p.angleDeg)||p.scale<=0)return "ornament-nonfinite-placement:"+a.id;
  const ap=pose(a.id,p,footprints);
  if(ap?!insideZone(ap,w,h,gap,wrap):p.y-ra-gap<0||p.y+ra+gap>h)return "ornament-outside-height:"+a.id;
  if(!wrap&&!ap&&(p.x-ra-gap<0||p.x+ra+gap>w))return "ornament-outside-width:"+a.id;
  for(let j=i+1;j<nodes.length;j++){
   const b=nodes[j]!,q=pts[b.id];if(!q)return "ornament-nonfinite-placement:"+b.id;
   const rb=physicalRadius(b.id,q,h,footprints),dx=wrap?wrapDelta(q.x-p.x,w):q.x-p.x,d=Math.hypot(dx,q.y-p.y);
   const containing=t.edges.some(e=>((e.from===a.id&&e.to===b.id)||(e.from===b.id&&e.to===a.id))&&(e.relation==="nest"||e.relation==="enclose"));
   const bp=pose(b.id,q,footprints);
   if(containing){
    if(ap&&bp){
     const big=ap.width*ap.height>=bp.width*bp.height?ap:bp;
     const small=big===ap?bp:ap;
     if(!nestedRotated(big,small,gap,wrap?w:undefined))return "ornament-nesting-clearance:"+a.id+":"+b.id;
    }else if(d+Math.min(ra,rb)+gap>Math.max(ra,rb)+1e-6)return "ornament-nesting-clearance:"+a.id+":"+b.id;
   }else if(ap&&bp?overlapsRotated(ap,bp,gap,wrap?w:undefined):d+1e-6<ra+rb+gap)return "ornament-collision:"+a.id+":"+b.id;
  }
 }
}


/** Deterministic constructive restart: simulated annealing alone cannot escape
 * an initially invalid configuration when strict validation captures no states.
 * Place the largest envelopes first, checking each partial packing. */
function constructValidLayout(
 t:Topology,original:Record<string,LayoutPoint>,w:number,h:number,wrap:boolean,gap:number,
 footprints:RefineOptions["physicalFootprints"]
):Record<string,LayoutPoint>|undefined {
 if(!footprints)return undefined;
 const nodes=[...t.nodes].sort((a,b)=>{
  const fa=footprints[a.id],fb=footprints[b.id];
  return (fb?.widthMm??0)*(fb?.heightMm??0)-(fa?.widthMm??0)*(fa?.heightMm??0);
 });
 const shrinkOptions=[1,.85,.7,.55,.5];
 const placed:Record<string,LayoutPoint>={};
 // Parents must be placed before their children to make nested relations
 // geometrically possible. Cycles are rejected by final validation.
 const order=[...nodes].sort((a,b)=>{
  const parentA=t.edges.filter(e=>e.to===a.id&&(e.relation==="nest"||e.relation==="enclose")).length;
  const parentB=t.edges.filter(e=>e.to===b.id&&(e.relation==="nest"||e.relation==="enclose")).length;
  return parentA-parentB;
 });
 for(const node of order){
  const start=original[node.id]!,foot=footprints[node.id];
  if(!foot)return undefined;
  const parent=t.edges.find(e=>e.to===node.id&&(e.relation==="nest"||e.relation==="enclose")&&placed[e.from]);
  const anchor=parent?placed[parent.from]!:undefined;
  const positions:{x:number;y:number}[]=[];
  if(anchor)positions.push({x:anchor.x,y:anchor.y});
  positions.push({x:start.x,y:start.y});
  // Explore the whole usable area in deterministic order.
  for(let yi=0;yi<10;yi++)for(let xi=0;xi<24;xi++)
   positions.push({x:(xi+.5)*w/24,y:(yi+.5)*h/10});
  let chosen:LayoutPoint|undefined;
  // Scale each object independently; shrinking every motif by the same
  // factor cannot make an equally-sized child fit inside its parent.
  for(const shrink of shrinkOptions){
   const trialScale=start.scale*shrink;
   for(const angle of [0,90,45,-45,start.angleDeg]){
    for(const pos of positions){
     const p={...start,x:pos.x,y:pos.y,scale:trialScale,angleDeg:angle};
     const partial={...placed,[node.id]:p};
     const included=new Set(Object.keys(partial));
     const sub:Topology={...t,nodes:t.nodes.filter(n=>included.has(n.id)),edges:t.edges.filter(e=>included.has(e.from)&&included.has(e.to))};
     if(!geometryError(sub,partial,w,h,wrap,gap,footprints)){chosen=p;break;}
    }
    if(chosen)break;
   }
   if(chosen)break;
  }
  if(!chosen)return undefined;
  placed[node.id]=chosen;
 }
 if(!geometryError(t,placed,w,h,wrap,gap,footprints))return placed;
 return undefined;
}

export function refineOrnamentalLayout(
 t:Topology,layout:Layout,w:number,h:number,seed:string,
 zone?:GarmentZone,options:RefineOptions={}
):Layout{
 if(t.nodes.length<2||w<=0||h<=0)return layout;
 const random=rng(seed+":ornament"),wrap=!!zone?.wrapAllowed&&options.seamPolicy!=="avoid";
 const gap=Math.max(0,options.minGapMm??.8),footprints=options.physicalFootprints;
 const base:Record<string,LayoutPoint>=Object.fromEntries(Object.entries(layout.points).map(([id,p])=>[id,{...p}]));
 const pts:Record<string,LayoutPoint>=Object.fromEntries(Object.entries(layout.points).map(([id,p])=>[id,{...p}]));
 let cost=measure(t,pts,w,h,wrap,gap,options.symmetry??"none",base,footprints);
 let bestValid:Record<string,LayoutPoint>|undefined;
 let bestCost=Infinity;
 const capture=()=>{
  if(geometryError(t,pts,w,h,wrap,gap,footprints)===undefined&&cost<bestCost){
   bestCost=cost;
   bestValid=Object.fromEntries(Object.entries(pts).map(([id,p])=>[id,{...p}]));
  }
 };
 capture();
 const count=clamp(Math.floor(options.iterations??320),0,3000),nodes=t.nodes;
 for(let i=0;i<count;i++){
  const node=nodes[Math.floor(random()*nodes.length)]!,p=pts[node.id]!;
  const old={...p},temp=Math.max(.05,4*(1-i/Math.max(1,count)));
  const step=Math.min(w,h)*(.04*(1-i/Math.max(1,count))+.002);
  p.x+= (random()*2-1)*step;p.y+=(random()*2-1)*step;
  // Bounded scale mutation allows a nested motif to shrink within a larger one.
  if(random()<.38){
   const minScale=options.minScale??.55,maxScale=options.maxScale??1.45;
   const originalScale=footprints?.[node.id]?.originalScale;
   const low=originalScale?Math.max(minScale,originalScale*.5):minScale;
   const high=originalScale?Math.min(maxScale,originalScale*1.5):maxScale;
   p.scale=clamp(p.scale*(random()<.5?.94:1.06),low,Math.max(low,high));
  }
  // Rotate instances in manufacturable increments; canonical paths are unchanged.
  if(random()<.35)p.angleDeg=Math.round((p.angleDeg+(random()<.5?-15:15))/15)*15;
  const rectangle=pose(node.id,p,footprints);
  const extent=rectangle?rotatedExtents(rectangle):undefined;
  const marginX=(extent?.x??physicalRadius(node.id,p,h,footprints))+gap;
  const marginY=(extent?.y??physicalRadius(node.id,p,h,footprints))+gap;
  p.x=wrap?((p.x%w)+w)%w:clamp(p.x,marginX,Math.max(marginX,w-marginX));
  p.y=clamp(p.y,marginY,Math.max(marginY,h-marginY));
  const next=measure(t,pts,w,h,wrap,gap,options.symmetry??"none",base,footprints);
  if(next<=cost||random()<Math.exp((cost-next)/temp)){cost=next;capture();}
  else Object.assign(p,old);
 }
 // Return the best manufacturable candidate encountered, not the last random state.
 if(options.strictGeometry!==false){
  if(!bestValid){
   const constructed=constructValidLayout(t,base,w,h,wrap,gap,footprints);
   if(constructed)return {points:constructed,iterations:layout.iterations+count,energy:measure(t,constructed,w,h,wrap,gap,options.symmetry??"none",base,footprints)};
   throw new Error(geometryError(t,pts,w,h,wrap,gap,footprints)??"ornament-no-valid-layout");
  }
  return {points:bestValid,iterations:layout.iterations+count,energy:bestCost};
 }
 return {points:pts,iterations:layout.iterations+count,energy:cost};
}
