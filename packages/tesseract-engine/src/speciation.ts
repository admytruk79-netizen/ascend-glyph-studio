import type {Topology} from "./topology";
import {structuralDistance} from "./novelty";

export type SpeciesId="toroidal"|"branching"|"axial"|"radial"|"sparse-asymmetric"|"band"|"hybrid";
export type SpeciesMember={topology:Topology;species:SpeciesId;signature:string};
const has=(t:Topology,...xs:string[])=>t.nodes.some(n=>xs.includes(n.form))||t.edges.some(e=>xs.includes(e.relation));
export function classifySpecies(t:Topology):SpeciesId{
 const n=Math.max(1,t.nodes.length),e=t.edges.length;
 const tor=has(t,"orbit","enclosure","return"),branch=has(t,"bifurcation","branch"),rad=has(t,"radiate","radial-emission"),axis=has(t,"axis","ascend","anchor");
 const sparse=e/n<.85,interrupt=has(t,"terminate","oppose","intersect"),repeat=has(t,"repeat","flow");
 if(tor&&!branch&&!rad)return "toroidal";if(branch&&!tor)return "branching";if(rad)return "radial";if(axis&&!tor&&!branch)return "axial";if(sparse&&interrupt)return "sparse-asymmetric";if(repeat&&e/n>=1)return "band";return "hybrid";
}
export function speciesSignature(t:Topology){return [classifySpecies(t),...new Set(t.nodes.map(n=>n.form)),...new Set(t.edges.map(e=>e.relation))].join("|")}
export function speciate(ts:Topology[]){const m=new Map<SpeciesId,Topology[]>();for(const t of ts){const s=classifySpecies(t),a=m.get(s)??[];a.push(t);m.set(s,a)}return m}
export function diverseSelection(scored:{t:Topology;score:number}[],keep:number):Topology[]{
 const viable=scored.filter(x=>Number.isFinite(x.score)),groups=new Map<SpeciesId,{t:Topology;score:number}[]>();
 for(const x of viable){const s=classifySpecies(x.t),a=groups.get(s)??[];a.push(x);groups.set(s,a)}
 for(const a of groups.values())a.sort((x,y)=>y.score-x.score);
 const out:Topology[]=[];let round=0;while(out.length<keep&&[...groups.values()].some(a=>a.length>round)){
  for(const [,a] of groups){const x=a[round];if(!x)continue;if(out.some(o=>structuralDistance(o,x.t)<.08))continue;out.push(x.t);if(out.length>=keep)break}round++;
 }return out;
}
