import type {SemanticStep} from "./intent";
import type {RetrievedPrinciple} from "./knowledge";

export type OctaveStage="do"|"re"|"mi"|"fa"|"sol"|"la"|"si"|"do2";
export type TopologyNode={id:string;conceptId:string;form:string;scale:number;octaveStage?:OctaveStage;octaveDepth?:number};
export type TopologyEdge={from:string;to:string;relation:string;weight:number};
export type Topology={nodes:TopologyNode[];edges:TopologyEdge[]};

const formByOperation:Record<SemanticStep["operation"],string>={
 originate:"seed",continue:"axis",branch:"bifurcation",oppose:"opposition",cross:"crossing",
 protect:"enclosure",transform:"mutation",vanish:"void",return:"orbit",ascend:"axis"
};
const relationByOperation:Record<SemanticStep["operation"],string>={
 originate:"anchor",continue:"flow",branch:"branch",oppose:"oppose",cross:"intersect",
 protect:"enclose",transform:"transform",vanish:"terminate",return:"return",ascend:"ascend"
};

export function buildTopology(steps:SemanticStep[],principles:RetrievedPrinciple[]):Topology{
 const nodes=steps.map((s,i)=>({id:`s${i}`,conceptId:s.conceptId,form:formByOperation[s.operation],scale:i===0?1:Math.min(4,1+(i%4))}));
 const edges:TopologyEdge[]=[];
 for(let i=1;i<nodes.length;i++)edges.push({from:nodes[i-1]!.id,to:nodes[i]!.id,relation:relationByOperation[steps[i]!.operation],weight:steps[i]!.weight});
 // Cultural principles enrich grammar without replacing the ASCEND semantic skeleton.
 for(const p of principles.slice(0,Math.min(6,principles.length))){
  if(nodes.length<2||!p.relations.length)continue;
  const a=Math.abs(hash(p.id))%nodes.length,b=(a+1+Math.abs(hash(p.id+"b"))%(nodes.length-1))%nodes.length;
  edges.push({from:nodes[a]!.id,to:nodes[b]!.id,relation:p.relations[0]!,weight:Math.min(1,p.relevance)});
 }
 return {nodes,edges};
}
function hash(s:string){let h=0;for(const c of s)h=((h<<5)-h+c.charCodeAt(0))|0;return h;}
