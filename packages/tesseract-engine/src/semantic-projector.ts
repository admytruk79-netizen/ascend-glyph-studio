import type {DesignGenome} from "./genome";
import type {SvgProjection} from "./svg-projector";
import type {GarmentTrajectory} from "./garment-trajectory";
import type {GarmentZone} from "./garment";
import {solveRelationalLayout} from "./relational-layout";
import {primitiveForForm} from "./ascend-primitives";

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!));
const f=(x:number)=>Number(x.toFixed(2));
type Point={x:number;y:number};

function geometry(form:string,p:Point,r:number,id:string):string{
 const primitive=primitiveForForm(form);
 const x=p.x,y=p.y,k=f(r),a=`data-form="${esc(form)}" data-node="${esc(id)}"`;
 if(primitive){
  const scale=f((k*2)/100),tx=f(x-k),ty=f(y-k);
  const paths=primitive.paths.map((d,i)=>`<path d="${esc(d)}" data-source-path="${i}" vector-effect="non-scaling-stroke"/>`).join("");
  return `<g ${a} data-primitive="${primitive.id}" data-source-status="${primitive.status}" transform="translate(${tx} ${ty}) scale(${scale})">${paths}</g>`;
 }
 switch(form){
  case "enclosure": return `<path ${a} d="M ${f(x-k*.25)} ${f(y-k)} C ${f(x-k*1.3)} ${f(y-k)} ${f(x-k*1.2)} ${f(y+k)} ${f(x)} ${f(y+k)} C ${f(x+k*1.2)} ${f(y+k)} ${f(x+k*1.3)} ${f(y-k)} ${f(x+k*.25)} ${f(y-k)}"/>`;
  case "mutation": return `<path ${a} d="M ${f(x-k)} ${f(y+k*.65)} Q ${f(x-k*.2)} ${f(y-k)} ${f(x+k*.12)} ${f(y)} Q ${f(x+k*.45)} ${f(y+k*.8)} ${f(x+k)} ${f(y-k*.8)}"/>`;
  default: return `<path ${a} d="M ${f(x-k*.5)} ${f(y+k*.6)} L ${f(x)} ${f(y-k*.7)} L ${f(x+k*.5)} ${f(y+k*.6)}"/>`;
 }
}

/** Split the shortest wrapped quadratic at the garment seam, preserving its curve.
 * The continuation starts on the opposite edge, not at its own endpoint.
 * This is preview geometry; stitch-IR seam policy remains independently enforced.
 */
export function splitWrappedQuadratic(a:Point,b:Point,width:number,bend:number){
 const dx=b.x-a.x,wrap=width>0&&Math.abs(dx)>width/2;
 const tx=wrap?b.x-Math.sign(dx)*width:b.x;
 const control:Point={x:(a.x+tx)/2,y:(a.y+b.y)/2+bend};
 const end:Point={x:tx,y:b.y};
 const first={from:a,control,to:end};
 if(!wrap)return [first];
 const seam=dx>0?0:width,t=(seam-a.x)/(tx-a.x);
 if(!(t>0&&t<1))return [first];
 const mix=(p:Point,q:Point,k:number):Point=>({x:p.x+(q.x-p.x)*k,y:p.y+(q.y-p.y)*k});
 const left=mix(a,control,t),right=mix(control,end,t),cut=mix(left,right,t);
 const shift=dx>0?width:-width;
 return [
  {from:a,control:left,to:cut},
  {from:{x:cut.x+shift,y:cut.y},control:{x:right.x+shift,y:right.y},to:b}
 ];
}

export function projectSemanticGeometry(g:DesignGenome,width=800,height=240,zone?:GarmentZone,options?:{relationStride?:number;minGapMm?:number;seamPolicy?:"avoid"|"continuous"|"resolve"}):SvgProjection{
 const nodes=g.topology.nodes,layout=solveRelationalLayout(g.topology,width,height,g.seed,zone,{minGapMm:options?.minGapMm,seamPolicy:options?.seamPolicy}),pos=new Map(nodes.map(v=>[v.id,layout.points[v.id]!]));
 const stride=Math.max(0,Math.floor(options?.relationStride??1));
 const paths=g.topology.edges.flatMap((e,i)=>{
  if(stride===0||i%stride!==0)return [];
  const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)return [];
  const bend=(i%2?1:-1)*Math.min(38,height*.14)*(1-e.weight*.35);
  const segments=splitWrappedQuadratic(a,b,zone?.wrapAllowed?width:0,bend);
  return segments.map((segment,j)=>{
   const {from,control,to}=segment;
   const attributes=j===0
    ?`id="relation-${i}" data-relation="${esc(e.relation)}" data-weight="${f(e.weight)}"`
    :`data-wrap-continuation="relation-${i}"`;
   return `<path ${attributes} d="M ${f(from.x)} ${f(from.y)} Q ${f(control.x)} ${f(control.y)} ${f(to.x)} ${f(to.y)}"/>`;
  });
 }).join("");
 const shapes=nodes.map(v=>{const p=pos.get(v.id)!;const shape=geometry(v.form,p,Math.min(24,height*.105)*p.scale,v.id);return `<g transform="rotate(${f(p.angleDeg)} ${f(p.x)} ${f(p.y)})" data-layer="${p.layer}">${shape}</g>`;}).join("");
 const metadata=`<metadata data-layout="constraint-relational" data-iterations="${layout.iterations}" data-energy="${f(layout.energy)}" data-wrap="${zone?.wrapAllowed?"true":"false"}"/>`;
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-genome="${esc(g.id)}">${metadata}<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}${shapes}</g></svg>`,width,height,featureMap:Object.fromEntries(nodes.map(v=>[v.id,v.conceptId]))};
}

export function renderZoneTrajectories(projection:SvgProjection,zoneId:string,trajectories:GarmentTrajectory[]):SvgProjection{
 const marks=trajectories.flatMap(t=>{
  const points=t.points.filter(p=>p.zoneId===zoneId);
  if(!points.length)return [];
  const xy=points.map(p=>({x:f(p.x01*projection.width),y:f(p.y01*projection.height)}));
  if(xy.length===1){
   const p=xy[0]!;
   return [`<circle cx="${p.x}" cy="${p.y}" r="2.5" data-trajectory="${esc(t.id)}" data-trajectory-role="${points[0]!.role}"/>`];
  }
  const d=xy.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ");
  return [`<path d="${d}" data-trajectory="${esc(t.id)}" data-trajectory-relation="${esc(t.relation)}"/>`];
 }).join("");
 if(!marks)return projection;
 const layer=`<g data-trajectory-layer="${esc(zoneId)}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${marks}</g>`;
 return {...projection,svg:projection.svg.replace("</svg>",`${layer}</svg>`)};
}

