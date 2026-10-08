import type {LearnedRelationPrior} from "./learned-relation-prior";
import type {StructuralFeedback} from "./structural-feedback";
import {weightedRelation} from "./learned-relation-prior";
import type {Topology,TopologyEdge} from "./topology";
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const rels=["anchor","nest","orbit","intersect","bridge","oppose","radiate","flow","enclose","repeat","branch","transform","terminate","return","ascend"];
const forms=["seed","axis","bifurcation","opposition","enclosure","mutation","void","orbit","radial-emission","spatial-flow"];

export function mutateTopology(base:Topology,seed:string,index:number,prior?:LearnedRelationPrior,feedback?:StructuralFeedback):Topology{
 const nodes=base.nodes.map(n=>({...n})),edges=base.edges.map(e=>({...e}));
 if(!nodes.length)return {nodes,edges};
 const mode=hash(seed+":"+index)%5;
 if(mode===0&&edges.length){const i=hash(seed+"e"+index)%edges.length;edges[i]={...edges[i]!,relation:weightedRelation(hash(seed+"r"+index),rels,prior,feedback)};}
 if(mode===1&&nodes.length>1){
  const i=hash(seed+"n"+index)%nodes.length;
  const spread=feedback?.scaleSeparationBoost??0;
  const choices=spread>.45?[1,1.5,2.5,4]:[1,2,3,4];
  nodes[i]={...nodes[i]!,scale:choices[hash(seed+"s"+index)%choices.length]!};
 }
 if(mode===2&&nodes.length>2){const a=hash(seed+"a"+index)%nodes.length;let b=hash(seed+"b"+index)%nodes.length;if(a===b)b=(b+1)%nodes.length;const edge:TopologyEdge={from:nodes[a]!.id,to:nodes[b]!.id,relation:weightedRelation(hash(seed+"x"+index),rels,prior,feedback),weight:.55};edges.push(edge);}
 if(mode===3&&edges.length>2){edges.splice(hash(seed+"d"+index)%edges.length,1);}
 if(mode===4&&nodes.length>1){
  const i=hash(seed+"f"+index)%nodes.length;
  const current=nodes[i]!.form;
  const allowed=forms.filter(x=>x!==current && !(feedback?.avoidRelations.includes("intersect")&&x==="crossing"));
  nodes[i]={...nodes[i]!,form:allowed[hash(seed+"ff"+index)%allowed.length]!};
 }
 return {nodes,edges};
}
