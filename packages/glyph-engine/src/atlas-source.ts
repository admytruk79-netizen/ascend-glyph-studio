import { glyphRegistry, GlyphRecord } from "../../glyph-registry/src/registry";
import { DiarySynthesisInput } from "./diary";

export interface AtlasSourceSelection {
 schema:"ascend.atlas-selection.v1";
 seed:string;
 glyphs:Array<{glyphId:string;sourceVersion:number;vectorAssetKey:string}>;
 rejected:Array<{glyphId:string;reason:string}>;
}

const hash=(s:string)=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

export function verifiedAtlasSources(records:readonly GlyphRecord[]=glyphRegistry):GlyphRecord[]{
 return records.filter(g=>g.immutable&&g.status==="canonical-digital"&&g.vectorStatus==="geometry-verified");
}

/** Selects authored atlas geometry without using family labels as semantic ontology. */
export function selectAtlasSources(input:DiarySynthesisInput,count=3,records:readonly GlyphRecord[]=glyphRegistry):AtlasSourceSelection{
 if(count<2||count>5)throw new Error("atlas synthesis requires 2-5 source glyphs");
 const verified=verifiedAtlasSources(records);
 if(verified.length<count)throw new Error(`insufficient verified atlas geometry: need ${count}, have ${verified.length}`);
 const ranked=[...verified].sort((a,b)=>{
  const ah=hash(input.seed+"|"+a.id),bh=hash(input.seed+"|"+b.id);
  return ah-bh||a.id.localeCompare(b.id);
 });
 const chosen=ranked.slice(0,count);
 return{
  schema:"ascend.atlas-selection.v1",seed:input.seed,
  glyphs:chosen.map(g=>({glyphId:g.id,sourceVersion:g.sourceVersion,vectorAssetKey:g.vectorAssetKey})),
  rejected:records.filter(g=>!verified.some(v=>v.id===g.id)).map(g=>({glyphId:g.id,reason:"source geometry not canonical/verified"}))
 };
}
