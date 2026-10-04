import type {DesignGenome} from "./genome";
import type {SvgProjection} from "./svg-projector";
import type {GarmentTrajectory} from "./garment-trajectory";

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!));
const f=(x:number)=>Number(x.toFixed(2));
type Point={x:number;y:number};

function geometry(form:string,p:Point,r:number,id:string):string{
 const x=p.x,y=p.y,k=f(r),a=`data-form="${esc(form)}" data-node="${esc(id)}"`;
 switch(form){
  case "seed": return `<path ${a} d="M ${f(x)} ${f(y-k)} C ${f(x+k*.9)} ${f(y-k*.65)} ${f(x+k*.7)} ${f(y+k*.8)} ${f(x)} ${f(y+k)} C ${f(x-k*.7)} ${f(y+k*.8)} ${f(x-k*.9)} ${f(y-k*.65)} ${f(x)} ${f(y-k)} Z"/>`;
  case "axis": return `<path ${a} d="M ${f(x)} ${f(y-k)} L ${f(x)} ${f(y+k)} M ${f(x-k*.4)} ${f(y)} L ${f(x+k*.4)} ${f(y)}"/>`;
  case "torus": case "orbit": return `<g ${a}><ellipse cx="${f(x)}" cy="${f(y)}" rx="${k}" ry="${f(k*.58)}"/><path d="M ${f(x-k*.85)} ${f(y)} Q ${f(x)} ${f(y+k*.35)} ${f(x+k*.85)} ${f(y)}"/></g>`;
  case "bifurcation": case "branch": return `<path ${a} d="M ${f(x)} ${f(y+k)} L ${f(x)} ${f(y-k*.12)} Q ${f(x-k*.12)} ${f(y-k*.48)} ${f(x-k*.85)} ${f(y-k)} M ${f(x)} ${f(y-k*.12)} Q ${f(x+k*.16)} ${f(y-k*.6)} ${f(x+k*.7)} ${f(y-k*.9)}"/>`;
  case "opposition": return `<path ${a} d="M ${f(x-k)} ${f(y-k*.65)} L ${f(x-k*.22)} ${f(y)} L ${f(x-k)} ${f(y+k*.65)} M ${f(x+k)} ${f(y-k*.65)} L ${f(x+k*.22)} ${f(y)} L ${f(x+k)} ${f(y+k*.65)}"/>`;
  case "crossing": return `<path ${a} d="M ${f(x-k)} ${f(y-k*.65)} L ${f(x+k)} ${f(y+k*.65)} M ${f(x-k)} ${f(y+k*.65)} L ${f(x-k*.12)} ${f(y+k*.08)} M ${f(x+k*.12)} ${f(y-k*.08)} L ${f(x+k)} ${f(y-k*.65)}"/>`;
  case "enclosure": return `<path ${a} d="M ${f(x-k*.25)} ${f(y-k)} C ${f(x-k*1.3)} ${f(y-k)} ${f(x-k*1.2)} ${f(y+k)} ${f(x)} ${f(y+k)} C ${f(x+k*1.2)} ${f(y+k)} ${f(x+k*1.3)} ${f(y-k)} ${f(x+k*.25)} ${f(y-k)}"/>`;
  case "void": return `<path ${a} d="M ${f(x-k)} ${f(y)} L ${f(x-k*.3)} ${f(y)} M ${f(x+k*.3)} ${f(y)} L ${f(x+k)} ${f(y)}"/>`;
  case "mutation": return `<path ${a} d="M ${f(x-k)} ${f(y+k*.65)} Q ${f(x-k*.2)} ${f(y-k)} ${f(x+k*.12)} ${f(y)} Q ${f(x+k*.45)} ${f(y+k*.8)} ${f(x+k)} ${f(y-k*.8)}"/>`;
  default: return `<path ${a} d="M ${f(x-k*.5)} ${f(y+k*.6)} L ${f(x)} ${f(y-k*.7)} L ${f(x+k*.5)} ${f(y+k*.6)}"/>`;
 }
}

export function projectSemanticGeometry(g:DesignGenome,width=800,height=240):SvgProjection{
 const nodes=g.topology.nodes,n=nodes.length,pad=Math.min(38,width*.08),usable=Math.max(1,width-pad*2);
 const pos=new Map(nodes.map((v,i)=>[v.id,{x:pad+(n<2?.5:i/(n-1))*usable,y:height*(.48+(i%3-1)*.12)}]));
 const paths=g.topology.edges.flatMap((e,i)=>{const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)return [];const bend=(i%2?1:-1)*Math.min(32,height*.12);return [`<path id="relation-${i}" data-relation="${esc(e.relation)}" d="M ${f(a.x)} ${f(a.y)} Q ${f((a.x+b.x)/2)} ${f((a.y+b.y)/2+bend)} ${f(b.x)} ${f(b.y)}"/>`]}).join("");
 const shapes=nodes.map(v=>{const p=pos.get(v.id)!;return geometry(v.form,p,Math.min(22,height*.1)*(v.scale/2),v.id)}).join("");
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-genome="${esc(g.id)}"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}${shapes}</g></svg>`,width,height,featureMap:Object.fromEntries(nodes.map(v=>[v.id,v.conceptId]))};
}

export function renderZoneTrajectories(base:SvgProjection,zoneId:string,trajectories:GarmentTrajectory[]):SvgProjection{
 const relevant=trajectories.filter(t=>t.zones.includes(zoneId)); if(!relevant.length)return base;
 const paths=relevant.map(t=>{const p=t.points.find(x=>x.zoneId===zoneId);if(!p)return "";const x=f(p.x01*base.width),end=p.role==="exit"?base.height:f(base.height*.95);
 return `<path id="${esc(t.id)}-${esc(zoneId)}" data-trajectory="${esc(t.id)}" data-relation="${esc(t.relation)}" d="M ${x} 0 C ${f(x-base.width*.08)} ${f(base.height*.3)} ${f(x+base.width*.08)} ${f(base.height*.7)} ${x} ${end}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`;}).join("");
 return {...base,svg:base.svg.replace("</svg>",`<g data-zone-trajectories="${esc(zoneId)}">${paths}</g></svg>`)};
}
