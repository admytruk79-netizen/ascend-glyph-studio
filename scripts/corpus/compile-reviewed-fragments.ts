/** Compile provenance-reviewed, split-labeled image analysis into Tesseract
 * structural fragment libraries. Does NOT fetch images or approve rights.
 *
 * CORPUS_ANALYSIS_IN=data/research/embroidery-analysis.ndjson
 * FRAGMENT_LIBRARY_OUT=data/research/reviewed-fragment-library.json
 * npx tsx scripts/corpus/compile-reviewed-fragments.ts
 */
import {createReadStream} from "node:fs";
import {createInterface} from "node:readline";
import {mkdir,writeFile} from "node:fs/promises";
import {dirname} from "node:path";
import {compileReviewedFragmentEvidence,type ReviewedFragmentRecord} from "../../packages/tesseract-engine/src/reviewed-fragment-compiler";

const input=process.env.CORPUS_ANALYSIS_IN??"data/research/embroidery-analysis.ndjson";
const output=process.env.FRAGMENT_LIBRARY_OUT??"data/research/reviewed-fragment-library.json";
const max=Number(process.env.FRAGMENT_ANALYSIS_LIMIT??10000);
if(!Number.isInteger(max)||max<1||max>100000)throw Error("Invalid FRAGMENT_ANALYSIS_LIMIT");

async function main(){
 const records:ReviewedFragmentRecord[]=[],malformed:{objectId:string;reason:string}[]=[];
 for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
  if(!line.trim())continue;
  if(records.length+malformed.length>=max)throw Error("Fragment input exceeds configured limit");
  try{
   const r=JSON.parse(line);
   if(!r.reference||!r.traditionId||!["train","validation","holdout"].includes(r.split)){
    malformed.push({objectId:String(r.objectId??"unknown"),reason:"explicit-tradition-and-split-required"});continue;
   }
   if(!r.structure||r.reference.structuralFeaturesVersion!==r.structure.schema){
    malformed.push({objectId:String(r.objectId??"unknown"),reason:"analysis-schema-mismatch"});continue;
   }
   records.push({traditionId:r.traditionId,split:r.split,reference:r.reference});
  }catch{malformed.push({objectId:"unknown",reason:"invalid-json"});}
 }
 const result=compileReviewedFragmentEvidence(records);
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,JSON.stringify({
  schema:"ascend.reviewed-fragment-library.v1",
  status:"structural-reference-only",
  manufacturerValidated:false,physicallyValidated:false,
  input,counts:{...result.counts,malformed:malformed.length},
  libraries:result.libraries,excluded:[...malformed,...result.excluded]
 },null,2)+"\n");
 console.log(JSON.stringify({output,counts:{...result.counts,malformed:malformed.length},traditions:Object.keys(result.libraries)}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
