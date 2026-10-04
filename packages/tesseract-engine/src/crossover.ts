import type {Topology,TopologyEdge} from "./topology";
import {classifySpecies} from "./speciation";
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function crossoverTopology(a:Topology,b:Topology,seed:string,index:number):Topology{
 const cutA=Math.max(1,hash(seed+"a"+index)%Math.max(1,a.nodes.length)),cutB=hash(seed+"b"+index)%Math.max(1,b.nodes.length);
 const chosen=[...a.nodes.slice(0,cutA),...b.nodes.slice(cutB)].filter((n,i,x)=>x.findIndex(y=>y.id===n.id)===i).map((n,i)=>({...n,id:`x${i}`}));
 const conceptToNew=new Map<string,string>();for(const n of chosen)if(!conceptToNew.has(n.conceptId))conceptToNew.set(n.conceptId,n.id);
 const source=[...a.edges,...b.edges],edges:TopologyEdge[]=[];
 for(const e of source){const an=[...a.nodes,...b.nodes].find(n=>n.id===e.from),bn=[...a.nodes,...b.nodes].find(n=>n.id===e.to);if(!an||!bn)continue;const from=conceptToNew.get(an.conceptId),to=conceptToNew.get(bn.conceptId);if(from&&to&&from!==to&&!edges.some(x=>x.from===from&&x.to===to&&x.relation===e.relation))edges.push({...e,from,to})}
 if(!edges.length&&chosen.length>1)for(let i=1;i<chosen.length;i++)edges.push({from:chosen[i-1]!.id,to:chosen[i]!.id,relation:"flow",weight:.5});
 return {nodes:chosen,edges};
}
export function crossSpecies(a:Topology,b:Topology,seed:string,index:number){if(classifySpecies(a)===classifySpecies(b))return null;return crossoverTopology(a,b,seed,index)}
