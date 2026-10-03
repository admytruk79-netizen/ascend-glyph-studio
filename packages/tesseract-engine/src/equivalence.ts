import type {DesignGenome} from "./genome";
export type ProjectionSignature={semanticNodes:string[];semanticEdges:string[];mediumFeatures:string[]};
export function signature(g:DesignGenome,mediumFeatures:string[]=[]):ProjectionSignature{return {semanticNodes:g.topology.nodes.map(n=>n.conceptId).sort(),semanticEdges:g.topology.edges.map(e=>`${e.from}:${e.relation}:${e.to}`).sort(),mediumFeatures:[...mediumFeatures].sort()}}
export function semanticallyEquivalent(a:ProjectionSignature,b:ProjectionSignature){return JSON.stringify(a.semanticNodes)===JSON.stringify(b.semanticNodes)&&JSON.stringify(a.semanticEdges)===JSON.stringify(b.semanticEdges)}
