export type VisualTradition="ukrainian"|"arabic-islamic"|"indigenous-north-american"|"ascend";
export type VisualScale="composition"|"motif"|"micro-detail"|"border"|"field";
export interface VisualCorpusAsset{
 id:string;assetUri:string;tradition:VisualTradition;region?:string;community?:string;
 scale:VisualScale;rightsApproved:boolean;rightsNote:string;sourceUri?:string;
 tags:string[];familyId?:string;split:"train"|"validation"|"holdout";
}
export interface OrnamentAlphabetFamily{
 id:string;tradition:Exclude<VisualTradition,"ascend">;letter:string;name:string;
 assetIds:string[];grammarTags:string[];region?:string;community?:string;
}
export function validateCorpusAsset(a:VisualCorpusAsset){
 if(!a.id||!a.assetUri||!a.rightsNote)throw new Error("Visual corpus asset requires id, URI and rights note");
 if(a.tradition==="indigenous-north-american"&&!a.community&&!a.region)throw new Error("Indigenous corpus assets require community or region provenance");
 if(!a.rightsApproved&&a.split==="train")throw new Error("Unapproved asset cannot enter training split");
}
export function validateAlphabet(families:OrnamentAlphabetFamily[]){
 const seen=new Set<string>();
 for(const f of families){
  if(!/^[A-Z]$/.test(f.letter))throw new Error("Alphabet family letter must be A-Z");
  const k=f.tradition+":"+f.letter;if(seen.has(k))throw new Error("Duplicate alphabet family "+k);seen.add(k);
  if(f.tradition==="indigenous-north-american"&&!f.community&&!f.region)throw new Error("Indigenous alphabet family requires specific provenance");
  if(!f.assetIds.length)throw new Error("Alphabet family must reference visual assets");
 }
 return {families:families.length,traditions:new Set(families.map(f=>f.tradition)).size,complete:["ukrainian","arabic-islamic","indigenous-north-american"].every(t=>families.filter(f=>f.tradition===t).length===26)};
}
