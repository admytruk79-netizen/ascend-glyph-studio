import type {ComplexityVector,WeightedRef} from "./dimensions";
import type {Topology} from "./topology";

export type Evaluation={score:number;complexity:ComplexityVector;penalties:{id:string;value:number}[]};

export function evaluateTopology(t:Topology,semanticCount:number,culturalCount:number,antiStyle:WeightedRef[]=[]):Evaluation{
 const n=Math.max(1,t.nodes.length),e=t.edges.length;
 const relations=new Set(t.edges.map(x=>x.relation));
 const forms=new Set(t.nodes.map(x=>x.form));
 const cycles=Math.max(0,e-n+1);
 const complexity:ComplexityVector={
  topological:clamp((relations.size+cycles)/(n+3)),
  semantic:clamp(semanticCount/8),
  hierarchical:clamp(new Set(t.nodes.map(x=>x.scale)).size/4),
  rhythmic:clamp(relations.size/8),
  transformational:clamp(t.edges.filter(x=>["transform","terminate","return","intersect","branch"].includes(x.relation)).length/6),
  cultural:clamp(culturalCount/8),
  visual:clamp((forms.size+relations.size)/(n+8)),
  production:clamp((e+n)/24)
 };
 const penalties=antiStyle.map(a=>({id:a.id,value:0})); // detector adapters populate these later.
 const score=100+relations.size*2+forms.size*2-cycles+Object.values(complexity).reduce((a,b)=>a+b,0)*3;
 return {score,complexity,penalties};
}
function clamp(n:number){return Math.max(0,Math.min(1,n));}
