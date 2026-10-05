import library from "../data/semantic-textile-library.v1.json" with { type: "json" };
export type SemanticIntent={meanings:string[];cultures?:string[];seed:string};
type Rec=(typeof library.records)[number];
const score=(r:Rec,i:SemanticIntent)=>i.meanings.filter(m=>r.meanings.includes(m)).length*4+(i.cultures?.some(c=>r.culture.toLowerCase().includes(c.toLowerCase()))?3:0)+(r.risk==="low"?1:0);
export function selectSemanticRecords(i:SemanticIntent){return library.records.filter(r=>r.risk!=="restricted").map(r=>({record:r,score:score(r,i)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.record.id.localeCompare(b.record.id)).slice(0,12)}
export function derivePatternGrammar(i:SemanticIntent){const selected=selectSemanticRecords(i);return{schema:"ascend.semantic-pattern-grammar.v1",seed:i.seed,recordIds:selected.map(x=>x.record.id),principles:[...new Set(selected.flatMap(x=>x.record.principles))],meanings:i.meanings,provenance:{copiedHistoricalGeometry:false,mergedCulturalMeaning:false}}}
