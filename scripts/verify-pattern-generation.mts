import {generatePatterns} from "../packages/tesseract-engine/src/pattern-generator";
import {writeFileSync,mkdirSync} from "node:fs";
import {join} from "node:path";

const outDir=process.env.TESSERACT_SMOKE_OUTPUT;
if(outDir)mkdirSync(outDir,{recursive:true});
let failures=0;
for(const [mode,seed] of [["band","integration-band-001"],["emblem","integration-emblem-001"]] as const){
 try{
  const designs=generatePatterns({seed,concepts:["ancestry","protection","ascent"],mode,medium:"embroidery",complexity:.45,variations:4,population:16,generations:2});
  if(!designs.length)throw new Error("no manufacturable candidates");
  for(const d of designs){
   if(!d.svg.includes("<svg")||!d.stitchObjects?.length||!d.productionObjects?.length)throw new Error("missing SVG/stitch/production artifacts");
   for(const o of d.productionObjects){
    if(!Number.isFinite(o.placement.xMm)||!Number.isFinite(o.placement.yMm)||!Number.isFinite(o.physical.widthMm)||o.physical.widthMm<=0)throw new Error("invalid production object "+o.id);
   }
  }
  if(outDir){
   designs.forEach((d,i)=>writeFileSync(join(outDir,`${mode}-${i+1}.svg`),d.svg));
   writeFileSync(join(outDir,`${mode}-manifest.json`),JSON.stringify(designs.map(d=>({id:d.id,score:d.score,stitchObjects:d.stitchObjects?.length,productionObjects:d.productionObjects?.length,critique:d.finalCritique})),null,2));
  }
  process.stdout.write(JSON.stringify({mode,designs:designs.length,stitchObjects:designs.reduce((n,d)=>n+(d.stitchObjects?.length??0),0)})+"\n");
 }catch(error){failures++;process.stderr.write(`${mode} generation failure: ${String(error)}\n`);}
}
if(failures)process.exitCode=1;
