import type {Topology,TopologyNode} from "./topology";
import {primitiveForForm} from "./ascend-primitives";
import {transformationPath,type TransformRule} from "./primitive-grammar";

export type EvolutionPassage={fromNode:string;toNode:string;rules:TransformRule[];cost:number;semanticEffects:string[]};
export type EvolutionPlan={passages:EvolutionPassage[];unresolved:{fromNode:string;toNode:string;reason:string}[];totalCost:number};

function primitive(n:TopologyNode){return primitiveForForm(n.form)?.id;}
export function planPrimitiveEvolution(t:Topology):EvolutionPlan{
 const passages:EvolutionPassage[]=[],unresolved:EvolutionPlan["unresolved"]=[];
 for(const e of t.edges){const a=t.nodes.find(n=>n.id===e.from),b=t.nodes.find(n=>n.id===e.to);if(!a||!b)continue;const pa=primitive(a),pb=primitive(b);if(!pa||!pb){unresolved.push({fromNode:e.from,toNode:e.to,reason:"primitive-not-registered"});continue}
  const rules=transformationPath(pa,pb,6);if(!rules){unresolved.push({fromNode:e.from,toNode:e.to,reason:`no-transform-path:${pa}->${pb}`});continue}
  passages.push({fromNode:e.from,toNode:e.to,rules,cost:rules.reduce((s,r)=>s+r.cost,0),semanticEffects:rules.map(r=>r.semanticEffect)});
 }
 return {passages,unresolved,totalCost:passages.reduce((s,p)=>s+p.cost,0)};
}
