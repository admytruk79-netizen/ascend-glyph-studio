import { EvidenceObservation,PrincipleSignal } from "./grammar";import { analyzeMorphology,type MorphologyObservation } from "./morphology";import { ResearchSnapshot,runResearchDrivenEngine } from "./research-engine";import { EngineIntent } from "./core";
export interface Queryable{query<T=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<{rows:T[]}>}
type PrincipleRow={id:string;principle_kind:string;label:string;abstraction:Record<string,unknown>|null;cultural_access:string;confidence:number};
type EvidenceRow={principle_id:string;source_id:string;confidence:number;interpretation:string|null;source_metadata:Record<string,unknown>|null};

function stance(s:string|null):"supports"|"contradicts"{return /contradict|exception|counterexample/i.test(s??"")?"contradicts":"supports"}
export async function loadResearchSnapshot(db:Queryable):Promise<ResearchSnapshot>{
 const p=await db.query<PrincipleRow>(`select id::text, principle_kind,label,abstraction,cultural_access,confidence from knowledge_principle`);
 const e=await db.query<EvidenceRow>(`select e.principle_id::text,e.source_id::text,e.confidence,e.interpretation,s.metadata as source_metadata from knowledge_evidence e join knowledge_source s on s.id=e.source_id`);
 const principles:PrincipleSignal[]=p.rows.map(x=>({id:x.id,kind:x.principle_kind,label:x.label,confidence:Number(x.confidence),culturalAccess:x.cultural_access,abstraction:x.abstraction??{}}));
 const observations:EvidenceObservation[]=e.rows.map(x=>({principleId:x.principle_id,sourceId:x.source_id,confidence:Number(x.confidence),stance:stance(x.interpretation),culturalAccess:String(x.source_metadata?.cultural_access??"open"),region:typeof x.source_metadata?.region==="string"?x.source_metadata.region:undefined,period:typeof x.source_metadata?.period==="string"?x.source_metadata.period:undefined}));
 const m=await db.query<{source_id:string;artifact_id:string|null;form_id:string|null;form_kind:string;confidence:number;properties:Record<string,unknown>|null;cultural_access:string|null}>(`select e.source_id::text,a.id::text artifact_id,f.id::text form_id,f.form_kind,coalesce(f.confidence,e.confidence) confidence,f.properties,p.cultural_access from knowledge_evidence e join knowledge_principle p on p.id=e.principle_id left join knowledge_artifact a on a.id=e.artifact_id left join knowledge_form f on f.artifact_id=a.id where f.id is not null`);
 const allowed=new Set(["axis","branch","enclosure","step","pulse","arc","chevron","band","lattice","meander","rosette"]);
 const morphology:MorphologyObservation[]=m.rows.filter(x=>allowed.has(x.form_kind)).map(x=>({sourceId:x.source_id,artifactId:x.artifact_id??undefined,formId:x.form_id??undefined,primitive:x.form_kind as MorphologyObservation["primitive"],confidence:Number(x.confidence),count:typeof x.properties?.count==="number"?x.properties.count:undefined,symmetry:typeof x.properties?.symmetry==="string"?x.properties.symmetry as MorphologyObservation["symmetry"]:undefined,culturalAccess:x.cultural_access??"open"}));
 const analyzed=analyzeMorphology(morphology),sources=analyzed.map(x=>({id:x.sourceId,features:x.features,culturalRisk:x.culturalRisk}));
 return{principles,observations,sources};
}
export async function runFromDatabase(db:Queryable,intent:EngineIntent,count=8){return runResearchDrivenEngine(intent,await loadResearchSnapshot(db),count)}
