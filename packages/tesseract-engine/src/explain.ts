import type {IntentVector} from "./dimensions";import type {Topology} from "./topology";import type {RetrievedPrinciple} from "./knowledge";
export type DesignExplanation={summary:string;conceptPath:string[];structuralOperations:string[];culturalPrinciples:{id:string;traditionId:string;confidence:number}[]};
export function explainDesign(intent:IntentVector,t:Topology,p:RetrievedPrinciple[]):DesignExplanation{
 return {summary:`${intent.concepts.map(x=>x.id).join(" + ")} expressed through ${new Set(t.edges.map(e=>e.relation)).size} relational operations across ${new Set(t.nodes.map(n=>n.scale)).size} scales.`,
 conceptPath:intent.concepts.map(x=>x.id),structuralOperations:[...new Set(t.edges.map(e=>e.relation))],
 culturalPrinciples:p.map(x=>({id:x.id,traditionId:x.traditionId,confidence:x.confidence}))};
}
