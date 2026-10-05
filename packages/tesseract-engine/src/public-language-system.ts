export type SemanticRole="speaker"|"recipient"|"group"|"place"|"object";
export type SemanticRelation="love"|"trust"|"remember"|"return"|"meet"|"help"|"protect"|"safe"|"danger"|"give"|"receive"|"continue";
export interface SemanticNode{id:string;role?:SemanticRole;concept?:string}
export interface SemanticEdge{from:string;to:string;relation:SemanticRelation;qualifiers?:Record<string,string|number|boolean>}
export interface SemanticMessageV1{version:"tesseract-semantic-v1";nodes:SemanticNode[];edges:SemanticEdge[];localeHint?:string}
export interface PublicEnvelopeV1{kind:"public";version:1;message:SemanticMessageV1;seed:string;checksum:string}
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,"0")};
export function createPublicEnvelope(message:SemanticMessageV1,seed:string):PublicEnvelopeV1{const body=JSON.stringify({message,seed});return{kind:"public",version:1,message,seed,checksum:hash(body)}}
export function verifyPublicEnvelope(e:PublicEnvelopeV1){return e.checksum===hash(JSON.stringify({message:e.message,seed:e.seed}))}
