const fs = require("node:fs");
const path = require("node:path");
const {runPilotProduction} = require("../packages/tesseract-engine/dist/src/pilot-runner.js");
const intent={concepts:[{id:"ancestors",weight:1},{id:"freedom",weight:.9},{id:"protection",weight:.9},{id:"return",weight:.65},{id:"ascent",weight:.6}],traditions:[{id:"ascend-core",weight:1},{id:"ukrainian-ornament",weight:.8}],character:[{id:"ordered-organic",weight:.72},{id:"minimal-complex",weight:.7},{id:"quiet-ceremonial",weight:.78}],materialId:"linen-woven",zoneId:"sleeve-wrap"};
const result=runPilotProduction({seed:"heritage-start-001",intent,principles:[],sizeId:"pilot-m",population:64,generations:5,keep:12});
const output=path.resolve("tesseract-render-output");fs.mkdirSync(output,{recursive:true});
for(const artifact of result.artifacts){const name=path.basename(artifact.fileName);fs.writeFileSync(path.join(output,name),artifact.content);}
const summary={seed:result.batch.seed,candidates:result.batch.candidateCount,files:result.artifacts.map(x=>x.fileName),errors:result.errors,productionApproved:result.manifest?.productionApproved,blockers:result.manifest?.blockers};
fs.writeFileSync(path.join(output,"render-summary.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(result.errors.length||!result.batch.candidateCount)process.exitCode=1;
