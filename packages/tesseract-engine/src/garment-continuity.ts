import type {GarmentConfiguration,GarmentZone,GarmentZoneKind} from "./garment";
import type {Topology,TopologyEdge} from "./topology";

export type ZoneLink={
 from:GarmentZoneKind;to:GarmentZoneKind;relation:string;
 seamPolicy:"cross"|"resolve"|"restart";priority:number;
};

export type ContinuityEvent={
 fromZoneId:string;toZoneId:string;relation:string;
 seamPolicy:ZoneLink["seamPolicy"];fromNode:string;toNode:string;
 registrationRequired:boolean;
};

const links:ZoneLink[]=[
 {from:"chest",to:"shoulder",relation:"branch",seamPolicy:"cross",priority:1},
 {from:"shoulder",to:"sleeve",relation:"flow",seamPolicy:"cross",priority:1},
 {from:"sleeve",to:"cuff",relation:"return",seamPolicy:"resolve",priority:1},
 {from:"collar",to:"placket",relation:"anchor",seamPolicy:"cross",priority:2},
 {from:"yoke",to:"shoulder",relation:"bridge",seamPolicy:"cross",priority:2},
 {from:"back",to:"yoke",relation:"ascend",seamPolicy:"resolve",priority:3},
 {from:"placket",to:"hem",relation:"anchor",seamPolicy:"resolve",priority:3}
];

function endpoint(t:Topology,last=false){return t.nodes[last?t.nodes.length-1:0]?.id;}

export function continuityLinks(){return links.slice().sort((a,b)=>a.priority-b.priority);}

export function connectGarmentZones(
 garment:GarmentConfiguration,
 topologies:Record<string,Topology>
):ContinuityEvent[]{
 const byKind=new Map<GarmentZoneKind,GarmentZone[]>();
 for(const z of garment.zones.filter(x=>x.editable)){const a=byKind.get(z.kind)??[];a.push(z);byKind.set(z.kind,a);}
 const events:ContinuityEvent[]=[];
 for(const l of continuityLinks()){
  for(const a of byKind.get(l.from)??[])for(const b of byKind.get(l.to)??[]){
   const ta=topologies[a.id],tb=topologies[b.id];if(!ta||!tb)continue;
   const fromNode=endpoint(ta,true),toNode=endpoint(tb,false);if(!fromNode||!toNode)continue;
   events.push({fromZoneId:a.id,toZoneId:b.id,relation:l.relation,seamPolicy:l.seamPolicy,fromNode,toNode,registrationRequired:l.seamPolicy==="cross"});
  }
 }
 return events;
}

export function continuityEdges(events:ContinuityEvent[]):TopologyEdge[]{
 return events.map(e=>({from:`${e.fromZoneId}:${e.fromNode}`,to:`${e.toZoneId}:${e.toNode}`,relation:e.relation,weight:e.seamPolicy==="cross"?.9:.7}));
}
