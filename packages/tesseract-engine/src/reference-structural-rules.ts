/** Evidence-gated structural rules. This module does not trace historical motifs. */
export type Access="approved"|"research-only"|"restricted"|"unknown";
export type Review="approved"|"pending"|"restricted";
export type Operation="repeat"|"alternate"|"nest"|"mirror"|"interrupt"|"branch"|"surround"|"scale-shift"|"void";
export type ReferenceEvidence={
 objectId:string;institution:string;objectUrl:string;imageSha256:string;
 rightsStatus:Access;culturalReview:Review;objectFamilyId:string;
 structuralFeaturesVersion:string;operations:Operation[];
};
export type StructuralRule={
 ruleId:string;operation:Operation;supportingObjectIds:string[];
 evidenceStatus:"research-only"|"approved";independentInstitutions:number;
};
export type ExtractionResult={rules:StructuralRule[];excluded:{objectId:string;reason:string}[]};
const operations:Operation[]=["repeat","alternate","nest","mirror","interrupt","branch","surround","scale-shift","void"];
/** A fragment/anchor is not an independent source. Only actual object URLs count. */
const sourceUrlKey=(value:string):string|null=>{
 try {
  const url=new URL(value);
  if(url.protocol!=="https:"&&url.protocol!=="http:")return null;
  url.hash="";
  return url.toString();
 }catch{return null;}
};
export function extractStructuralRules(references:readonly ReferenceEvidence[],minimumIndependentObjects=2):ExtractionResult{
 if(!Number.isInteger(minimumIndependentObjects)||minimumIndependentObjects<2)throw Error("At least two independent objects required");
 const eligible:ReferenceEvidence[]=[];
 const excluded:ExtractionResult["excluded"]=[];
 const ids=new Set<string>();
 const urls=new Set<string>();
 const hashes=new Set<string>();
 const families=new Set<string>();
 for(const r of references){
  const objectId=typeof r?.objectId==="string"?r.objectId.trim():"";
  const institution=typeof r?.institution==="string"?r.institution.trim():"";
  const family=typeof r?.objectFamilyId==="string"?r.objectFamilyId.trim():"";
  const hash=typeof r?.imageSha256==="string"?r.imageSha256.toLowerCase():"";
  const url=typeof r?.objectUrl==="string"?sourceUrlKey(r.objectUrl):null;
  if(!objectId||!institution||!url||!family||!r?.structuralFeaturesVersion||!/^[a-f0-9]{64}$/.test(hash)||!Array.isArray(r?.operations)){
   excluded.push({objectId:objectId||"unknown",reason:"missing-or-invalid-provenance"});continue;
  }
  if(r.rightsStatus!=="approved"||r.culturalReview!=="approved"){
   excluded.push({objectId,reason:"rights-or-cultural-review-not-approved"});continue;
  }
  const familyKey=institution.toLowerCase()+"::"+family.toLowerCase();
  if(ids.has(objectId)||urls.has(url)||hashes.has(hash)||families.has(familyKey)){
   excluded.push({objectId,reason:"duplicate-image-or-object-family"});continue;
  }
  if(r.operations.some(op=>!operations.includes(op))){
   excluded.push({objectId,reason:"unknown-structural-operation"});continue;
  }
  ids.add(objectId);urls.add(url);hashes.add(hash);families.add(familyKey);eligible.push(r);
 }
 const rules:StructuralRule[]=[];
 for(const operation of operations){
  const supporting=eligible.filter(r=>r.operations.includes(operation));
  if(supporting.length<minimumIndependentObjects)continue;
  rules.push({ruleId:"structural:"+operation,operation,supportingObjectIds:supporting.map(r=>r.objectId),independentInstitutions:new Set(supporting.map(r=>r.institution)).size,evidenceStatus:"approved"});
 }
 return {rules,excluded};
}
export type CandidateLineage={canonicalGeometryVersion:string;glyphInstanceIds:string[];ruleIds:string[];sourceObjectIds:string[];designStatus:"concept";manufacturerValidated:false;physicallyValidated:false};
export function buildCandidateLineage(input:{canonicalGeometryVersion:string;glyphInstanceIds:string[];ruleIds:string[]},rules:readonly StructuralRule[]):CandidateLineage{
 if(!input.canonicalGeometryVersion.trim()||input.glyphInstanceIds.length===0||input.glyphInstanceIds.some(id=>!id.trim()))throw Error("Canonical geometry lineage required");
 const byId=new Map(rules.map(r=>[r.ruleId,r]));
 if(input.ruleIds.some(id=>!byId.has(id)||byId.get(id)!.evidenceStatus!=="approved"))throw Error("Unapproved or unknown structural rule");
 return {canonicalGeometryVersion:input.canonicalGeometryVersion,glyphInstanceIds:[...input.glyphInstanceIds],ruleIds:[...input.ruleIds],sourceObjectIds:[...new Set(input.ruleIds.flatMap(id=>byId.get(id)!.supportingObjectIds))],designStatus:"concept",manufacturerValidated:false,physicallyValidated:false};
}
