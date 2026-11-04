/** Turns the existing reviewed-image analysis into split-safe fragment evidence.
 * This is an evidence gate, NOT a license checker or cultural-review substitute.
 */
import {extractStructuralRules,type ReferenceEvidence} from "./reference-structural-rules";
import {fragmentLibraryFromReviewedRules} from "./reviewed-fragment-adapter";
import type {FragmentLibrary} from "./structural-fragments";

export type ReviewedFragmentRecord={
 traditionId:string;
 split:"train"|"validation"|"holdout";
 reference:ReferenceEvidence;
};
export type ReviewedFragmentCompilation={
 libraries:Record<string,FragmentLibrary>;
 counts:{input:number;train:number;heldOut:number;excluded:number;approvedRules:number;fragments:number};
 excluded:{objectId:string;reason:string}[];
};

/** No train/validation leakage, no cross-tradition rule synthesis, no unreviewed promotion. */
export function compileReviewedFragmentEvidence(records:readonly ReviewedFragmentRecord[]):ReviewedFragmentCompilation{
 const grouped=new Map<string,ReferenceEvidence[]>();
 const excluded:ReviewedFragmentCompilation["excluded"]=[];
 let heldOut=0,train=0,approvedRules=0,fragments=0;
 for(const record of records){
  const r=record.reference;
  if(record.split==="validation"||record.split==="holdout"){heldOut++;continue;}
  if(record.split!=="train"){excluded.push({objectId:r?.objectId??"unknown",reason:"invalid-or-missing-split"});continue;}
  if(!record.traditionId?.trim()||["global","unattributed","unknown"].includes(record.traditionId.toLowerCase().trim())){
   excluded.push({objectId:r?.objectId??"unknown",reason:"missing-specific-tradition"});continue;
  }
  if(!r||r.rightsStatus!=="approved"||r.culturalReview!=="approved"){
   excluded.push({objectId:r?.objectId??"unknown",reason:"independent-rights-and-cultural-review-required"});continue;
  }
  train++;
  const key=record.traditionId.trim();
  const group=grouped.get(key)??[];group.push(r);grouped.set(key,group);
 }
 const libraries:Record<string,FragmentLibrary>={};
 for(const [traditionId,refs] of [...grouped].sort(([a],[b])=>a.localeCompare(b))){
  const extraction=extractStructuralRules(refs);
  excluded.push(...extraction.excluded);
  const library=fragmentLibraryFromReviewedRules(extraction.rules,traditionId);
  approvedRules+=extraction.rules.length;fragments+=library.fragments.length;
  excluded.push(...library.rejected.map(x=>({objectId:x.sourceId,reason:x.reason})));
  libraries[traditionId]=library;
 }
 return {libraries,counts:{input:records.length,train,heldOut,excluded:excluded.length,approvedRules,fragments},excluded};
}
