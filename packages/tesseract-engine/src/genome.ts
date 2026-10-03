import type {Topology} from "./topology";import type {RelationalGraph} from "./relational";
export type Invariance="immutable"|"constrained"|"elastic"|"medium-specific";
export type GenomeRule={feature:string;invariance:Invariance;min?:number;max?:number;note?:string};
export type DesignGenome={id:string;seed:string;topology:Topology;relations:RelationalGraph;rules:GenomeRule[]};
export function genomeFromTopology(seed:string,t:Topology):DesignGenome{
 const nodes=t.nodes.map(n=>n.id);return {id:`genome:${seed}`,seed,topology:t,relations:{nodes,edges:t.edges.map(e=>({from:e.from,to:e.to,kind:e.relation,weight:e.weight,spatial:{cardinality:"1:1"}}))},
 rules:[
  {feature:"semantic-node-identity",invariance:"immutable"},
  {feature:"edge-relation",invariance:"constrained",note:"may adapt representation but not erase semantic relation"},
  {feature:"stroke-width",invariance:"elastic"},
  {feature:"stitch-recipe",invariance:"medium-specific"}
 ]};
}
