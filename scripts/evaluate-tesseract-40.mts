import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";

const suites:{name:string;mode:PatternMode;medium:string;concepts:string[];cultureIds:string[]}[]=[
 {name:"ukrainian-bands",mode:"band",medium:"embroidery",concepts:["lineage","growth","protection"],cultureIds:["ukraine"]},
 {name:"ascend-emblems",mode:"emblem",medium:"embroidery",concepts:["earth","water","fire","air","spirit"],cultureIds:["ukraine","britain"]},
 {name:"sleeve-compositions",mode:"sleeve",medium:"embroidery",concepts:["roots","path","ascent"],cultureIds:["ukraine","western-craft"]},
 {name:"western-leather",mode:"band",medium:"leather-tooling",concepts:["journey","freedom","return"],cultureIds:["western-craft","britain"]}
];
const dir=process.env.TESSERACT_EVALUATION_OUTPUT??"out/tesseract-evaluation";
mkdirSync(dir,{recursive:true});
const results:unknown[]=[];
let failureCount=0;
for(const suite of suites){
 const accepted:ReturnType<typeof generatePatterns>=[];
 const seen=new Set<string>();
 const failures:string[]=[];
 for(let batch=0;batch<8&&accepted.length<10;batch++){
  try{
   const designs=generatePatterns({seed:`evaluation:${suite.name}:${batch}`,concepts:suite.concepts,mode:suite.mode,medium:suite.medium,cultureIds:suite.cultureIds,complexity:.7,variations:10,population:32,generations:4});
   for(const d of designs){
    if(!d.svg.includes("<svg")||!d.productionObjects?.length||!d.stitchObjects?.length)continue;
    if(d.stitchObjects.some(o=>(o.kind==="fill"?o.polygon:o.path).some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))continue;
    // Deduplicate by complete geometry, not merely title or seed.
    const key=d.svg.replace(/data-palette="[^"]*"/g,"");
    if(seen.has(key))continue;
    seen.add(key);accepted.push(d);
    if(accepted.length===10)break;
   }
  }catch(e){failures.push(String(e));}
 }
 const folder=join(dir,suite.name);mkdirSync(folder,{recursive:true});
 for(const [i,d] of accepted.entries()){
  writeFileSync(join(folder,`design-${String(i+1).padStart(2,"0")}.svg`),d.svg);
  writeFileSync(join(folder,`design-${String(i+1).padStart(2,"0")}.stitch-ir.json`),JSON.stringify(d.stitchObjects,null,2));
 }
 const summary={suite:suite.name,requested:10,produced:accepted.length,failures,designs:accepted.map((d,i)=>({file:`design-${String(i+1).padStart(2,"0")}.svg`,id:d.id,score:d.score,novelty:d.novelty,manufacturingStatus:"digital-evaluation-only",stitchObjectCount:d.stitchObjects?.length??0,physicalSizeMm:d.physicalSizeMm}))};
 writeFileSync(join(folder,"manifest.json"),JSON.stringify(summary,null,2));
 results.push(summary);
 if(accepted.length<10)failureCount++;
 process.stdout.write(`${suite.name}: ${accepted.length}/10 generated\n`);
}
writeFileSync(join(dir,"evaluation-summary.json"),JSON.stringify(results,null,2));
if(failureCount)process.exitCode=1;
