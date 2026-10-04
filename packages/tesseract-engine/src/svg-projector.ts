import type {DesignGenome} from "./genome";
import {primitiveForForm} from "./ascend-primitives";
export type SvgProjection={svg:string;width:number;height:number;featureMap:Record<string,string>};
function esc(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!))}
export function projectGenomeSvg(g:DesignGenome,width=800,height=240):SvgProjection{
 const n=Math.max(1,g.topology.nodes.length),pad=42,step=n>1?(width-pad*2)/(n-1):0,cy=height/2;
 const pos=new Map(g.topology.nodes.map((x,i)=>[x.id,{x:pad+i*step,y:cy+(i%2?1:-1)*Math.min(46,12*x.scale)}]));
 const connectors=g.topology.edges.map((e,i)=>{const a=pos.get(e.from)!,b=pos.get(e.to)!;const mx=(a.x+b.x)/2;return `<path id="edge-${i}" data-relation="${esc(e.relation)}" d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} C ${mx.toFixed(2)} ${a.y.toFixed(2)}, ${mx.toFixed(2)} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`}).join("");
 const nodes=g.topology.nodes.map(x=>{const p=pos.get(x.id)!,primitive=primitiveForForm(x.form),size=26+x.scale*8;if(!primitive){return `<circle id="${esc(x.id)}" data-form="${esc(x.form)}" cx="${p.x}" cy="${p.y}" r="${3+x.scale}" fill="currentColor"/>`};const paths=primitive.paths.map(d=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("");return `<g id="${esc(x.id)}" data-form="${esc(x.form)}" data-primitive="${primitive.id}" data-status="${primitive.status}" transform="translate(${(p.x-size/2).toFixed(2)} ${(p.y-size/2).toFixed(2)}) scale(${(size/100).toFixed(4)})">${paths}</g>`}).join("");
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-genome="${esc(g.id)}"><g data-layer="relations">${connectors}</g><g data-layer="ascend-primitives">${nodes}</g></svg>`,width,height,featureMap:Object.fromEntries(g.topology.nodes.map(n=>[n.id,n.conceptId]))};
}
