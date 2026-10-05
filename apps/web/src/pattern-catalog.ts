import{buildGlyphPhrase,PhraseMeaning}from"../../../packages/glyph-engine/src/compound-language";import{renderDualReadingField}from"../../../packages/glyph-engine/src/dual-reading-field";
export const patternDefinitions=[
{id:"lineage",name:"Lineage Axis",meanings:["root","lineage","path"]},
{id:"flowering",name:"Flowering Field",meanings:["root","flowering","integration"]},
{id:"flight",name:"Flight",meanings:["path","flight","ascent"]},
{id:"guardian",name:"Guardian",meanings:["root","protection","transformation"]},
{id:"ascent",name:"Ascent Crown",meanings:["transformation","ascent","integration"]},
{id:"return",name:"Return",meanings:["lineage","integration","return"]}
]as const;
export function generatePatternSvg(patternId:string,seed="ascend-customer"){const d=patternDefinitions.find(x=>x.id===patternId)??patternDefinitions[0];const phrases=d.meanings.map((m,i)=>buildGlyphPhrase(seed+"|"+d.id+"|"+i,m as PhraseMeaning,3+i));return renderDualReadingField(phrases,seed+"|"+d.id).svg}
