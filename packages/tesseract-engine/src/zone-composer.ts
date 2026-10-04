import type {GarmentZone,GarmentZoneKind} from "./garment";
import type {Topology,TopologyEdge,TopologyNode} from "./topology";

export type ZoneBehavior={
 direction:"vertical"|"horizontal"|"radial"|"wrap"|"field";
 density:number;scale:number;compression:number;
 preferredRelations:string[];narrativeRole:string;
};

const behavior:Record<GarmentZoneKind,ZoneBehavior>={
 collar:{direction:"wrap",density:.72,scale:.55,compression:.8,preferredRelations:["enclose","repeat","return"],narrativeRole:"threshold"},
 placket:{direction:"vertical",density:.55,scale:.72,compression:.7,preferredRelations:["anchor","flow","ascend"],narrativeRole:"axis"},
 chest:{direction:"field",density:.5,scale:1,compression:.35,preferredRelations:["branch","radiate","enclose"],narrativeRole:"identity"},
 shoulder:{direction:"horizontal",density:.62,scale:.8,compression:.55,preferredRelations:["bridge","branch","flow"],narrativeRole:"transition"},
 sleeve:{direction:"vertical",density:.82,scale:1.15,compression:.3,preferredRelations:["branch","transform","intersect","flow"],narrativeRole:"development"},
 cuff:{direction:"wrap",density:.9,scale:.48,compression:.92,preferredRelations:["repeat","return","enclose"],narrativeRole:"closure"},
 yoke:{direction:"horizontal",density:.66,scale:.85,compression:.5,preferredRelations:["bridge","branch","anchor"],narrativeRole:"load-bearing"},
 hem:{direction:"horizontal",density:.76,scale:.58,compression:.82,preferredRelations:["repeat","return","anchor"],narrativeRole:"grounding"},
 back:{direction:"field",density:.42,scale:1.25,compression:.2,preferredRelations:["radiate","branch","orbit"],narrativeRole:"cosmos"}
};

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

export function behaviorForZone(kind:GarmentZoneKind):ZoneBehavior{return behavior[kind];}

export function composeTopologyForZone(base:Topology,zone:GarmentZone,seed:string):Topology{
 const b=behaviorForZone(zone.kind);
 const nodes:TopologyNode[]=base.nodes.map((n,i)=>({...n,scale:Math.max(1,Math.min(4,Math.round(n.scale*b.scale+(i%2?b.density:0))))}));
 const edges:TopologyEdge[]=base.edges.map((e,i)=>{
  const preferred=b.preferredRelations[(hash(seed+zone.id+":"+i))%b.preferredRelations.length]!;
  const keepOriginal=(hash(seed+":"+e.relation+":"+i)%100)/100>b.density;
  return {...e,relation:keepOriginal?e.relation:preferred,weight:Math.min(1,e.weight*(.8+b.density*.35))};
 });
 // Dense narrative zones may add a controlled secondary relation; never change semantic node identity.
 if(nodes.length>2&&b.density>.7){
  const a=hash(seed+zone.id)%nodes.length,bx=(a+2)%nodes.length;
  edges.push({from:nodes[a]!.id,to:nodes[bx]!.id,relation:b.preferredRelations[0]!,weight:.45+b.density*.25});
 }
 return {nodes,edges};
}
