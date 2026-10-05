export type EvidenceStatus="documented"|"interpretive"|"contested"|"unknown";
export type AccessPolicy="open-principle"|"review"|"restricted"|"prohibited";
export type ObservationKind="geometry"|"relation"|"composition"|"rhythm"|"placement"|"material"|"technique"|"color"|"scale"|"negative-space"|"semantic";
export interface SourceNode{id:string;institution?:string;title:string;url?:string;accessed?:string;authority:number}
export interface ObjectNode{id:string;sourceIds:string[];cultureIds:string[];traditionIds:string[];regionIds:string[];period?:string;objectType:string;access:AccessPolicy}
export interface ObservationNode{id:string;objectId:string;kind:ObservationKind;value:string;weight:number;status:EvidenceStatus;sourceIds:string[]}
export interface PatternKnowledgeGraph{sources:SourceNode[];objects:ObjectNode[];observations:ObservationNode[]}
export interface DerivedSignal{kind:ObservationKind;value:string;support:number;sourceDiversity:number;cultureDiversity:number;objectIds:string[]}
export function deriveSignals(g:PatternKnowledgeGraph,opts:{cultureIds?:string[];objectTypes?:string[];minSupport?:number;minSources?:number;minCultures?:number}={}):DerivedSignal[]{
 const allowed=new Set(g.objects.filter(o=>o.access!=="restricted"&&o.access!=="prohibited").filter(o=>!opts.cultureIds?.length||o.cultureIds.some(x=>opts.cultureIds!.includes(x))).filter(o=>!opts.objectTypes?.length||opts.objectTypes.includes(o.objectType)).map(o=>o.id));
 const groups=new Map<string,{kind:ObservationKind;value:string;support:number;sources:Set<string>;cultures:Set<string>;objects:Set<string>}>();
 for(const x of g.observations){if(!allowed.has(x.objectId)||x.status==="contested"||x.status==="unknown")continue;const o=g.objects.find(y=>y.id===x.objectId)!;const k=x.kind+"|"+x.value,v=groups.get(k)??{kind:x.kind,value:x.value,support:0,sources:new Set<string>(),cultures:new Set<string>(),objects:new Set<string>()};v.support+=x.weight;x.sourceIds.forEach(s=>v.sources.add(s));o.cultureIds.forEach(c=>v.cultures.add(c));v.objects.add(o.id);groups.set(k,v)}
 return [...groups.values()].map(v=>({kind:v.kind,value:v.value,support:v.support,sourceDiversity:v.sources.size,cultureDiversity:v.cultures.size,objectIds:[...v.objects]})).filter(v=>v.support>=(opts.minSupport??1)&&v.sourceDiversity>=(opts.minSources??1)&&v.cultureDiversity>=(opts.minCultures??1)).sort((a,b)=>b.support-a.support)
}
export function mergeKnowledgeGraphs(...graphs:PatternKnowledgeGraph[]):PatternKnowledgeGraph{const uniq=<T extends{id:string}>(xs:T[])=>[...new Map(xs.map(x=>[x.id,x])).values()];return{sources:uniq(graphs.flatMap(g=>g.sources)),objects:uniq(graphs.flatMap(g=>g.objects)),observations:uniq(graphs.flatMap(g=>g.observations))}}
