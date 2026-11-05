/** Validates the reviewed fragment export contract before A/B evaluation.
 * Metadata checks cannot replace independent source-rights or cultural review.
 */
import type {FragmentLibrary} from "./structural-fragments";

const relations=new Set(["anchor","flow","branch","oppose","intersect","enclose","transform","terminate","return","ascend"]);
const accesses=new Set(["structural-public","documented-public"]);
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const nonempty=(v:unknown):v is string=>typeof v==="string"&&v.trim().length>0;

/** Rejects inconsistent or unsafe export metadata; does not independently audit sources. */
export function validateReviewedFragmentBenchmarkLibrary(raw:unknown,tradition:string):FragmentLibrary{
 if(!nonempty(tradition))throw Error("Benchmark requires a specific tradition");
 if(!object(raw)||raw.schema!=="ascend.reviewed-fragment-library.v1"||raw.status!=="structural-reference-only"||raw.manufacturerValidated!==false||raw.physicallyValidated!==false)
  throw Error("Unknown, unreviewed, or production-mislabeled fragment export");
 if(!object(raw.libraries)||!object(raw.libraries[tradition]))throw Error("No reviewed fragment library for "+tradition);
 const library=raw.libraries[tradition];
 if(!Array.isArray(library.fragments)||library.fragments.length===0)throw Error("No independently reviewed training fragments for "+tradition);
 if(!Array.isArray(library.rejected))throw Error("Invalid fragment rejection manifest");
 const ids=new Set<string>();
 for(const fragment of library.fragments){
  if(!object(fragment)||!nonempty(fragment.id)||ids.has(fragment.id))throw Error("Missing or duplicate fragment ID");
  ids.add(fragment.id);
  const source=fragment.source;
  if(!object(source)||!nonempty(source.id)||source.traditionId!==tradition||source.verified!==true||source.rights!=="permitted-structural-study"||!accesses.has(source.access as string))
   throw Error("Fragment source fails provenance, tradition, or cultural access gate: "+fragment.id);
  if(!Array.isArray(source.sourceIds)||source.sourceIds.length<2||source.sourceIds.some(id=>!nonempty(id))||new Set(source.sourceIds).size!==source.sourceIds.length)
   throw Error("Fragment lacks two distinct supporting object IDs: "+fragment.id);
  if(!Array.isArray(fragment.relations)||fragment.relations.length===0||fragment.relations.some(r=>!relations.has(r)))
   throw Error("Invalid fragment structural relations: "+fragment.id);
  if(typeof fragment.nodeCount!=="number"||!Number.isInteger(fragment.nodeCount)||fragment.nodeCount<0||typeof fragment.edgeCount!=="number"||!Number.isInteger(fragment.edgeCount)||fragment.edgeCount<0||!Array.isArray(fragment.scaleRatios)||fragment.scaleRatios.some(n=>typeof n!=="number"||!Number.isFinite(n)||n<0.25||n>4))
   throw Error("Invalid fragment structural statistics: "+fragment.id);
 }
 return library as FragmentLibrary;
}
