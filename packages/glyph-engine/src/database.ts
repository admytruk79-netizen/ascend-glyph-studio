import { EvidenceObservation,PrincipleSignal } from "./grammar";import { FeatureVector } from "./originality";import { ResearchSnapshot,runResearchDrivenEngine } from "./research-engine";import { EngineIntent } from "./core";
export interface Queryable{query<T=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<{rows:T[]}>}
type PrincipleRow={id:string;principle_kind:string;label:string;abstraction:Record<string,unknown>|null;cultural_access:string;confidence:number};
type EvidenceRow={principle_id:string;source_id:string;confidence:number;interpretation:string|null;source_metadata:Record<string,unknown>|null};
const blank=():FeatureVector=>({axis:0,enclosure:0,branch:0,step:0,pulse:0,chevron:0,band:0,lattice:0,meander:0,radial:0});
function stance(s:string|null):"supports"|"contradicts"{return /contradict|exception|counterexample/i.test(s??"")?"contradicts":"supports"}
export async function loadResearchSnapshot(db:Queryable):Promise<ResearchSnapshot>{
 const p=await db.query<PrincipleRow>(`select id::text, principle_kind,label,abstraction,cultural_access,confidence from knowledge_principle`);
 const e=await db.query<EvidenceRow>(`select e.principle_id::text,e.source_id::text,e.confidence,e.interpretation,s.metadata as source_metadata from knowledge_evidence e join knowledge_source s on s.id=e.source_id`);
 const principles:PrincipleSignal[]=p.rows.map(x=>({id:x.id,kind:x.principle_kind,label:x.label,confidence:Number(x.confidence),culturalAccess:x.cultural_access,abstraction:x.abstraction??{}}));
 const observations:EvidenceObservation[]=e.rows.map(x=>({principleId:x.principle_id,sourceId:x.source_id,confidence:Number(x.confidence),stance:stance(x.interpretation),culturalAccess:String(x.source_metadata?.cultural_access??"open"),region:typeof x.source_metadata?.region==="string"?x.source_metadata.region:undefined,period:typeof x.source_metadata?.period==="string"?x.source_metadata.period:undefined}));
 // Source feature vectors remain zero until morphology extraction is persisted; this avoids inventing similarity evidence.
 const sourceIds=[...new Set(e.rows.map(x=>x.source_id))],sources=sourceIds.map(id=>({id,features:blank(),culturalRisk:"low" as const}));
 return{principles,observations,sources};
}
export async function runFromDatabase(db:Queryable,intent:EngineIntent,count=8){return runResearchDrivenEngine(intent,await loadResearchSnapshot(db),count)}
