import type {Topology,TopologyNode,TopologyEdge} from "./topology";

export type RecursiveGrammarOptions={depth?:number;maxNodes?:number;mutationRate?:number;maxBranching?:number};
const expandable=new Set(["seed","bifurcation","branch","orbit","axis","mutation","enclosure"]);
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function childForms(form:string):string[]{
 switch(form){
  case "seed":return ["axis","seed"];
  case "axis":return ["bifurcation","seed"];
  case "bifurcation":case "branch":return ["seed","axis","orbit"];
  case "orbit":return ["seed","seed","axis"];
  case "enclosure":return ["void","seed","orbit"];
  case "mutation":return ["axis","bifurcation"];
  default:return [];
 }
}
function relation(parent:string,child:string,i:number){if(parent==="orbit")return "orbit";if(parent==="enclosure")return "enclose";if(child==="bifurcation")return "branch";if(child==="seed")return i?"repeat":"anchor";return "flow";}

export function expandRecursiveGrammar(base:Topology,seed:string,opt:RecursiveGrammarOptions={}):Topology{
 const depth=Math.max(0,Math.min(4,opt.depth??2)),maxNodes=Math.max(base.nodes.length,opt.maxNodes??48),mutation=opt.mutationRate??.22,maxBranching=Math.max(1,Math.floor(opt.maxBranching??5));
 const nodes:TopologyNode[]=base.nodes.map(n=>({...n})),edges:TopologyEdge[]=base.edges.map(e=>({...e}));
 let frontier=base.nodes.map(n=>({node:n,level:0}));
 while(frontier.length&&nodes.length<maxNodes){
  const current=frontier.shift()!;if(current.level>=depth||!expandable.has(current.node.form))continue;
  const forms=childForms(current.node.form).slice(0,maxBranching),next:{node:TopologyNode;level:number}[]=[];
  forms.forEach((raw,i)=>{
   if(nodes.length>=maxNodes)return;
   const roll=(hash(seed+current.node.id+":"+current.level+":"+i)%1000)/1000;
   if(i>0&&roll>.55+mutation)return;
   const form=roll<mutation?(["seed","axis","orbit","bifurcation","void"][hash(seed+"m"+current.node.id+i)%5]!):raw;
   const node:TopologyNode={id:`${current.node.id}.r${current.level+1}.${i}`,conceptId:current.node.conceptId,form,scale:Math.max(1,current.node.scale-1)};
   nodes.push(node);edges.push({from:current.node.id,to:node.id,relation:relation(current.node.form,form,i),weight:Math.max(.32,.72-current.level*.12)});
   next.push({node,level:current.level+1});
  });frontier.push(...next);
 }
 return {nodes,edges};
}

export function grammarComplexity(t:Topology){
 const forms=new Set(t.nodes.map(n=>n.form)).size,relations=new Set(t.edges.map(e=>e.relation)).size;
 const recursive=t.nodes.filter(n=>n.id.includes(".r")).length;
 return {nodes:t.nodes.length,edges:t.edges.length,forms,relations,recursive,score:forms*1.5+relations+Math.sqrt(Math.max(0,recursive))*2};
}
