import type {Topology,TopologyEdge} from "./topology";
import type {CulturalAccess} from "./dimensions";

/** A structural observation, never a reusable copy of a historical motif. */
export type FragmentSource={
 id:string; traditionId:string; sourceIds:string[]; access:CulturalAccess;
 rights:"permitted-structural-study"|"unknown"|"restricted";
 verified:boolean; context?:string;
};
export type StructuralFragment={
 id:string; source:FragmentSource; relations:readonly string[];
 nodeCount:number; edgeCount:number; scaleRatios:readonly number[];
};
export type FragmentRejection={sourceId:string;reason:string};
export type FragmentLibrary={fragments:StructuralFragment[];rejected:FragmentRejection[]};

const permittedRelations=new Set(["anchor","flow","branch","oppose","intersect","enclose","transform","terminate","return","ascend"]);
const allowedAccess=new Set<CulturalAccess>(["structural-public","documented-public"]);
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36);};

/** Extract relation and proportion statistics from an explicitly annotated topology.
 * This does NOT extract pixels, claim museum image access, or retain source geometry.
 */
export function extractStructuralFragments(observations:readonly {source:FragmentSource;topology:Topology}[]):FragmentLibrary{
 const fragments:StructuralFragment[]=[],rejected:FragmentRejection[]=[];
 for(const {source,topology} of observations){
  const reject=(reason:string)=>rejected.push({sourceId:source.id,reason});
  if(!allowedAccess.has(source.access)){reject("cultural-access-restricted");continue;}
  if(source.rights!=="permitted-structural-study"){reject("rights-not-cleared");continue;}
  if(!source.verified||!source.sourceIds.length||!source.traditionId){reject("insufficient-provenance");continue;}
  const nodes=new Map(topology.nodes.map(n=>[n.id,n]));
  if(nodes.size!==topology.nodes.length||topology.nodes.some(n=>!Number.isFinite(n.scale)||n.scale<=0)){reject("invalid-node-geometry");continue;}
  const edges=topology.edges.filter(e=>nodes.has(e.from)&&nodes.has(e.to)&&permittedRelations.has(e.relation));
  if(!edges.length){reject("no-usable-structural-relations");continue;}
  const relations=[...new Set(edges.map(e=>e.relation))].sort();
  const scaleRatios=edges.map(e=>{
   const a=nodes.get(e.from)!,b=nodes.get(e.to)!;
   return Math.round(Math.min(4,Math.max(.25,b.scale/a.scale))*100)/100;
  }).sort((a,b)=>a-b);
  fragments.push({id:`fragment-${hash(source.id+":"+relations.join(",")+":"+scaleRatios.join(","))}`,source,relations,nodeCount:nodes.size,edgeCount:edges.length,scaleRatios});
 }
 return {fragments,rejected};
}

export type RecombinationResult={topology:Topology;usedFragmentIds:string[];sourceIds:string[];status:"structural-reference-only"};
/** Recombines only abstract relation vocabulary on an ASCEND-native skeleton.
 * No historical motif nodes, contours or coordinates are transplanted.
 */
export function recombineStructuralFragments(base:Topology,library:FragmentLibrary,seed:string,maxEdges=6):RecombinationResult{
 const nodes=base.nodes.map(n=>({...n})),edges=base.edges.map(e=>({...e}));
 const ids=new Set(nodes.map(n=>n.id));
 if(ids.size!==nodes.length)throw new Error("duplicate-base-node-id");
 const fragments=library.fragments.filter(f=>allowedAccess.has(f.source.access)&&f.source.rights==="permitted-structural-study"&&f.source.verified&&f.source.sourceIds.length).sort((a,b)=>a.id.localeCompare(b.id));
 const used:string[]=[],sources=new Set<string>(),existing=new Set(edges.map(e=>`${e.from}|${e.to}|${e.relation}`));
 if(nodes.length<2)return {topology:{nodes,edges},usedFragmentIds:used,sourceIds:[],status:"structural-reference-only"};
 let cursor=parseInt(hash(seed),36)>>>0;
 for(let i=0;i<Math.min(Math.max(0,maxEdges),fragments.length*3);i++){
  if(!fragments.length)break;
  const f=fragments[cursor%fragments.length]!;
  const relation=f.relations[(cursor>>>4)%f.relations.length];
  const from=nodes[(cursor>>>8)%nodes.length]!,to=nodes[(cursor+1+(cursor>>>16)%(nodes.length-1))%nodes.length]!;
  const key=`${from.id}|${to.id}|${relation}`;
  if(from.id!==to.id&&!existing.has(key)&&relation&&permittedRelations.has(relation)){
   edges.push({from:from.id,to:to.id,relation,weight:.45} satisfies TopologyEdge);
   existing.add(key);used.push(f.id);f.source.sourceIds.forEach(id=>sources.add(id));
  }
  cursor=(Math.imul(cursor^0x9e3779b9,1664525)+1013904223)>>>0;
 }
 return {topology:{nodes,edges},usedFragmentIds:[...new Set(used)],sourceIds:[...sources].sort(),status:"structural-reference-only"};
}
