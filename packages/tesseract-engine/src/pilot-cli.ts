import {runPilotProduction} from "./pilot-runner.js";
import type {IntentVector} from "./dimensions.js";

const intent:IntentVector={
 concepts:[{id:"ancestors",weight:1},{id:"freedom",weight:.9},{id:"protection",weight:.9},{id:"return",weight:.65},{id:"ascent",weight:.6}],
 traditions:[{id:"ascend-core",weight:1},{id:"ukrainian-ornament",weight:.8}],
 character:[{id:"ordered-organic",weight:.72},{id:"minimal-complex",weight:.7},{id:"quiet-ceremonial",weight:.78}],
 materialId:"linen-woven",zoneId:"sleeve-wrap"
};
const result=runPilotProduction({seed:process.env.TESSERACT_SEED??"heritage-start-001",intent,principles:[],sizeId:process.env.ASCEND_SIZE??"pilot-m",population:64,generations:5,keep:12});
const summary={seed:result.batch.seed,candidates:result.batch.candidateCount,winner:result.batch.candidates[0]?.genomeId,artifacts:result.artifacts.map(x=>x.fileName),errors:result.errors,manifest:{confidence:result.manifest?.confidence,productionApproved:result.manifest?.productionApproved,blockers:result.manifest?.blockers,warnings:result.manifest?.warnings}};
process.stdout.write(JSON.stringify(summary,null,2)+"\n");
if(result.errors.length||!result.batch.candidateCount)process.exitCode=1;
