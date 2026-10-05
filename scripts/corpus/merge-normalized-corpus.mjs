import fs from"node:fs";
import path from"node:path";

const files=(process.env.INPUTS||"").split(",").filter(Boolean);
const output=process.env.OUTPUT||".corpus-out/merged/normalized-corpus.json";
const merged={version:"normalized-corpus-v1",sources:[],objects:[],observations:[],relationships:[]};
const uniq=(xs)=>[...new Map(xs.map(x=>[x.id,x])).values()];

for(const file of files){
  if(!fs.existsSync(file)) continue;
  const body=JSON.parse(fs.readFileSync(file,"utf8"));
  merged.sources.push(...(body.sources||[]));
  merged.objects.push(...(body.objects||[]));
  merged.observations.push(...(body.observations||[]));
  merged.relationships.push(...(body.relationships||[]));
}
merged.sources=uniq(merged.sources);
merged.objects=uniq(merged.objects);
merged.observations=uniq(merged.observations);
merged.relationships=uniq(merged.relationships);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(merged,null,2));
console.log({sources:merged.sources.length,objects:merged.objects.length,observations:merged.observations.length,relationships:merged.relationships.length});
