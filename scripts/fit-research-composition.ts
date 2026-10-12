/** Convert eligible analyzed corpus rows into a model artifact.
 * Usage: ANALYZED_IN=data/research/analyzed.ndjson PRIOR_OUT=data/research/composition-prior.json npx tsx scripts/fit-research-composition.ts
 * Requires reviewed rights metadata; refuses to write a model when insufficient.
 */
import {createReadStream,writeFileSync} from "node:fs";
import {createInterface} from "node:readline";
import {fitPriorFromAnalyzedRows,type AnalyzedResearchRow} from "../packages/tesseract-engine/src/research-composition-adapter";
const source=process.env.ANALYZED_IN??"data/research/analyzed.ndjson";
const output=process.env.PRIOR_OUT??"data/research/composition-prior.json";
async function main(){
 const rows:AnalyzedResearchRow[]=[];
 const rl=createInterface({input:createReadStream(source),crlfDelay:Infinity});
 for await(const line of rl){if(!line.trim())continue;rows.push(JSON.parse(line) as AnalyzedResearchRow);}
 const result=fitPriorFromAnalyzedRows(rows,Math.max(3,Number(process.env.PRIOR_MIN_EVIDENCE??25)));
 if(!result.prior)throw new Error(`insufficient rights-cleared, unique real-image evidence; eligible observations cannot support training (scanned=${rows.length})`);
 writeFileSync(output,JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),input:source,scanned:rows.length,...result},null,2));
 console.log(JSON.stringify({output,scanned:rows.length,accepted:result.accepted,rejected:result.rejected}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
