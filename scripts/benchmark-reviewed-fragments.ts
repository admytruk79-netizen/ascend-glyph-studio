/** Fixed-seed A/B evaluation of the actual Tesseract batch engine.
 * Requires a reviewed fragment-library export; no synthetic approval fallback.
 * No result is a production/manufacturer validation or an originality verdict.
 */
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {runTesseractBatch} from "../packages/tesseract-engine/src/batch";
import {validateReviewedFragmentBenchmarkLibrary} from "../packages/tesseract-engine/src/reviewed-fragment-library-validation";
const input=process.env.FRAGMENT_LIBRARY_IN??"data/research/reviewed-fragment-library.json";
const output=resolve(process.env.FRAGMENT_BENCHMARK_OUT??"data/research/fragment-benchmark");
const tradition=process.env.FRAGMENT_TRADITION??"ukrainian-ornament";
const seed=process.env.FRAGMENT_BENCHMARK_SEED??"heritage-start-001";
const intent={concepts:[{id:"ancestors",weight:1},{id:"freedom",weight:.9},{id:"protection",weight:.9},{id:"return",weight:.65},{id:"ascent",weight:.6}],traditions:[{id:"ascend-core",weight:1},{id:tradition,weight:.8}],materialId:"linen-woven",zoneId:"sleeve-wrap"};
const summary=(batch:ReturnType<typeof runTesseractBatch>)=>({
 candidateCount:batch.candidateCount,
 candidates:batch.candidates.map(c=>({
  lineageId:c.lineageId,score:c.score,novelty:c.novelty,
  objectives:c.objectives,trace:c.trace,genomeId:c.genomeId
 }))
});
async function main(){
 const raw:unknown=JSON.parse(await readFile(input,"utf8"));
 const library=validateReviewedFragmentBenchmarkLibrary(raw,tradition);
 const opts={seed,intent,principles:[],population:32,generations:3,keep:8};
 const baseline=runTesseractBatch(opts);
 const withFragments=runTesseractBatch({...opts,fragmentLibrary:library});
 if(!baseline.candidates.length||!withFragments.candidates.length||!baseline.specimenSheet||!withFragments.specimenSheet)throw Error("Benchmark did not produce both specimen sheets");
 // A/B output without actual fragment use is misleading: fail instead of claiming conditioning.
 const usedIds=new Set<string>(),sourceIds=new Set<string>();
 for(const candidate of withFragments.candidates)for(const trace of candidate.trace){
  if(trace.startsWith("fragment-ids:"))for(const id of trace.slice("fragment-ids:".length).split(","))if(id&&id!=="none")usedIds.add(id);
  if(trace.startsWith("fragment-sources:"))for(const id of trace.slice("fragment-sources:".length).split(","))if(id&&id!=="none")sourceIds.add(id);
 }
 if(!usedIds.size||!sourceIds.size)throw Error("Fragment-conditioned search used no reviewed fragments; refusing misleading A/B output");
 if([...usedIds].some(id=>!library.fragments.some(f=>f.id===id)))throw Error("Search trace references unknown fragment ID");
 await mkdir(output,{recursive:true});
 await Promise.all([
  writeFile(resolve(output,"baseline-specimens.svg"),baseline.specimenSheet.svg),
  writeFile(resolve(output,"fragment-specimens.svg"),withFragments.specimenSheet.svg),
  writeFile(resolve(output,"comparison.json"),JSON.stringify({
   schema:"ascend.fragment-benchmark.v1",seed,tradition,
   inputLibrary:input,libraryFragmentCount:library.fragments.length,
   usedFragmentIds:[...usedIds].sort(),usedSourceObjectIds:[...sourceIds].sort(),
   status:"concept-comparison-only",manufacturerValidated:false,physicallyValidated:false,
   baseline:summary(baseline),fragmentConditioned:summary(withFragments),
   warning:"Metadata admission does not independently verify source rights or cultural review. Automated scores do not prove visual superiority, originality, or production readiness."
  },null,2)+"\n")
 ]);
 console.log(JSON.stringify({output,seed,tradition,baseline:baseline.candidateCount,fragmentConditioned:withFragments.candidateCount,usedFragments:usedIds.size}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
