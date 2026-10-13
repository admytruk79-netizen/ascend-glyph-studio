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
export function extractStructuralRules(references:readonly ReferenceEvidence[],minimumIndependentObjects=2):ExtractionResult{
 if(!Number.isInteger(minimumIndependentObjects)||minimumIndependentObjects<2)throw Error("At least two independent objects required");
 const eligible:ReferenceEvidence[]=[];
 const excluded:ExtractionResult["excluded"]=[];
 const hashes=new Set<string>();
 const families=new Set<string>();
 for(const r of references){
  if(!r.objectId||!r.institution||!r.objectUrl||!r.objectFamilyId||!r.structuralFeaturesVersion||!r.imageSha256||!/^[a-f0-9]{64}$/i.test(r.imageSha256)){
   excluded.push({objectId:r.objectId,reason:"missing-or-invalid-provenance"});continue;
  }
  if(r.rightsStatus!=="approved"||r.culturalReview!=="approved"){
   excluded.push({objectId:r.objectId,reason:"rights-or-cultural-review-not-approved"});continue;
  }
  if(hashes.has(r.imageSha256)||families.has(r.institution+"::"+r.objectFamilyId)){
   excluded.push({objectId:r.objectId,reason:"duplicate-image-or-object-family"});continue;
  }
  if(r.operations.some(op=>!operations.includes(op))){
   excluded.push({objectId:r.objectId,reason:"unknown-structural-operation"});continue;
  }
  hashes.add(r.imageSha256);families.add(r.institution+"::"+r.objectFamilyId);eligible.push(r);
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
