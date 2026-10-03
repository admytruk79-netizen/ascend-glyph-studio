import type {DesignGenome} from "./genome";
export type SvgProjection={svg:string;width:number;height:number;featureMap:Record<string,string>};
function esc(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!))}
export function projectGenomeSvg(g:DesignGenome,width=800,height=240):SvgProjection{
 const n=Math.max(1,g.topology.nodes.length),pad=32,step=n>1?(width-pad*2)/(n-1):0,cy=height/2;
 const pos=new Map(g.topology.nodes.map((x,i)=>[x.id,{x:pad+i*step,y:cy+(i%2?1:-1)*Math.min(54,18*x.scale)}]));
 const lines=g.topology.edges.map((e,i)=>{const a=pos.get(e.from)!,b=pos.get(e.to)!;return `<path id="edge-${i}" data-relation="${esc(e.relation)}" d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="3"/>`}).join("");
 const nodes=g.topology.nodes.map(x=>{const p=pos.get(x.id)!;const r=3+x.scale*1.5;return `<circle id="${esc(x.id)}" data-form="${esc(x.form)}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${r}" fill="currentColor"/>`}).join("");
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-genome="${esc(g.id)}">${lines}${nodes}</svg>`,width,height,featureMap:Object.fromEntries(g.topology.nodes.map(n=>[n.id,n.conceptId]))};
}
