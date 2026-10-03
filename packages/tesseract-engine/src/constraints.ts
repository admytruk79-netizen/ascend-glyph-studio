import type {RetrievedPrinciple} from "./knowledge";
import type {Topology} from "./topology";

export type ConstraintResult={hard:string[];soft:{id:string;penalty:number}[]};

export function checkConstraints(t:Topology,principles:RetrievedPrinciple[]):ConstraintResult{
 const hard:string[]=[];const soft:{id:string;penalty:number}[]=[];
 const restricted=principles.filter(p=>p.access==="sacred-restricted");
 if(restricted.length)hard.push("restricted-cultural-material");
 if(new Set(t.nodes.map(n=>n.id)).size!==t.nodes.length)hard.push("duplicate-node-id");
 for(const e of t.edges)if(!t.nodes.some(n=>n.id===e.from)||!t.nodes.some(n=>n.id===e.to))hard.push("dangling-edge");
 const degree=new Map<string,number>();for(const e of t.edges){degree.set(e.from,(degree.get(e.from)??0)+1);degree.set(e.to,(degree.get(e.to)??0)+1)}
 if(Math.max(0,...degree.values())>Math.max(4,t.nodes.length-1))soft.push({id:"hub-dominance",penalty:.18});
 const rel=t.edges.map(e=>e.relation);if(rel.length>3&&new Set(rel).size===1)soft.push({id:"monotony",penalty:.2});
 return {hard:[...new Set(hard)],soft};
}
