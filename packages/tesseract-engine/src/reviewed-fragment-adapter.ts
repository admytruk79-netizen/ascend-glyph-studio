/** Adapter for the existing provenance-reviewed structural rule pipeline.
 * Only approved rules can influence ASCEND-native topology. Historical geometry is never copied.
 */
import type {StructuralRule} from "./reference-structural-rules";
import type {FragmentLibrary,FragmentSource,StructuralFragment} from "./structural-fragments";
const mapping:Record<string,string[]>={repeat:["flow","return"],alternate:["oppose"],nest:["enclose"],mirror:["oppose","return"],interrupt:["terminate"],branch:["branch"],surround:["enclose"],"scale-shift":["transform"],void:["terminate"]};
export function fragmentLibraryFromReviewedRules(rules:readonly StructuralRule[],institution="reviewed-corpus"):FragmentLibrary{
 const fragments:StructuralFragment[]=[],rejected:{sourceId:string;reason:string}[]=[];
 for(const r of rules){
  if(r.evidenceStatus!=="approved"||r.supportingObjectIds.length<2||r.independentInstitutions<1){
   rejected.push({sourceId:r.ruleId,reason:"unapproved-or-insufficient-independent-evidence"});continue;
  }
  const relations=mapping[r.operation];
  if(!relations){rejected.push({sourceId:r.ruleId,reason:"unsupported-operation"});continue;}
  const source:FragmentSource={id:r.ruleId,traditionId:institution,sourceIds:[...new Set(r.supportingObjectIds)],access:"documented-public",rights:"permitted-structural-study",verified:true,context:"Derived from reviewed structural rules; not source geometry or production validation"};
  fragments.push({id:"reviewed-"+r.ruleId,source,relations,nodeCount:0,edgeCount:0,scaleRatios:[]});
 }
 return {fragments,rejected};
}
