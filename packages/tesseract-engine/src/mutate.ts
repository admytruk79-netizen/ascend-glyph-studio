import type {Topology,TopologyEdge} from "./topology";
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const rels=["anchor","nest","orbit","intersect","bridge","oppose","radiate","flow","enclose","repeat","branch","transform","terminate","return","ascend"];

export function mutateTopology(base:Topology,seed:string,index:number):Topology{
 const nodes=base.nodes.map(n=>({...n})),edges=base.edges.map(e=>({...e}));
 if(!nodes.length)return {nodes,edges};
 const mode=hash(seed+":"+index)%4;
 if(mode===0&&edges.length){const i=hash(seed+"e"+index)%edges.length;edges[i]={...edges[i]!,relation:rels[hash(seed+"r"+index)%rels.length]!};}
 if(mode===1&&nodes.length>1){const i=hash(seed+"n"+index)%nodes.length;nodes[i]={...nodes[i]!,scale:1+(hash(seed+"s"+index)%4)};}
 if(mode===2&&nodes.length>2){const a=hash(seed+"a"+index)%nodes.length;let b=hash(seed+"b"+index)%nodes.length;if(a===b)b=(b+1)%nodes.length;const edge:TopologyEdge={from:nodes[a]!.id,to:nodes[b]!.id,relation:rels[hash(seed+"x"+index)%rels.length]!,weight:.55};edges.push(edge);}
 if(mode===3&&edges.length>2){edges.splice(hash(seed+"d"+index)%edges.length,1);}
 return {nodes,edges};
}
