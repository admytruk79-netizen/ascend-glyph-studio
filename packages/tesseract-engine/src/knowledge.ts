import type {CulturalAccess,IntentVector,ProvenanceRef,WeightedRef} from "./dimensions";

export type PrincipleRecord={
 id:string;traditionId:string;kind:string;concepts:string[];relations:string[];forms:string[];
 confidence:number;access:CulturalAccess;sourceIds:string[];tags?:string[];
};

export type RetrievedPrinciple=PrincipleRecord&{relevance:number};

const blocked=new Set<CulturalAccess>(["sacred-restricted"]);

export function retrievePrinciples(intent:IntentVector,principles:PrincipleRecord[],limit=24):RetrievedPrinciple[]{
 const concepts=new Map(intent.concepts.map(x=>[x.id.toLowerCase(),x.weight]));
 const traditions=new Map((intent.traditions??[]).map(x=>[x.id.toLowerCase(),x.weight]));
 return principles
  .filter(p=>!blocked.has(p.access))
  .map(p=>{
   const semantic=p.concepts.reduce((s,c)=>s+(concepts.get(c.toLowerCase())??0),0);
   const cultural=traditions.size?(traditions.get(p.traditionId.toLowerCase())??0):.25;
   const relevance=(semantic*2+cultural)*p.confidence;
   return {...p,relevance};
  })
  .filter(p=>p.relevance>0)
  .sort((a,b)=>b.relevance-a.relevance||a.id.localeCompare(b.id))
  .slice(0,limit);
}

export function provenanceOf(p:PrincipleRecord):ProvenanceRef[]{
 return p.sourceIds.map(sourceId=>({sourceId,principleId:p.id,confidence:p.confidence,access:p.access}));
}

export function refs(ids:string[],weight=.7):WeightedRef[]{return [...new Set(ids)].map(id=>({id,weight}));}
