import {generatePatterns,type PatternMode} from "../packages/tesseract-engine/src/pattern-generator";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {stitchIrPreview} from "./stitch-ir-preview";

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
 const diagnostics:{batch:number;generated:number;accepted:number;rejected:number}[]=[];
 for(let batch=0;batch<8&&accepted.length<10;batch++){
  try{
   const designs=generatePatterns({seed:`evaluation:${suite.name}:${batch}`,concepts:suite.concepts,mode:suite.mode,medium:suite.medium,cultureIds:suite.cultureIds,complexity:.7,variations:10,population:32,generations:4});
   const before=accepted.length;
   for(const d of designs){
    if(!d.svg.includes("<svg")||!d.productionObjects?.length||!d.stitchObjects?.length)continue;
    if(d.stitchObjects.some(o=>(o.kind==="fill"?o.polygon:o.path).some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))continue;
    // Deduplicate by complete geometry, not merely title or seed.
    const key=d.svg.replace(/data-palette="[^"]*"/g,"");
    if(seen.has(key))continue;
    seen.add(key);accepted.push(d);
    if(accepted.length===10)break;
   }
   diagnostics.push({batch,generated:designs.length,accepted:accepted.length-before,rejected:Math.max(0,designs.length-(accepted.length-before))});
   if(designs.length===0)failures.push(`batch ${batch}: generator returned zero viable designs`);
  }catch(e){failures.push(`batch ${batch}: ${String(e)}`);}
 }
 const folder=join(dir,suite.name);mkdirSync(folder,{recursive:true});
 for(const [i,d] of accepted.entries()){
  writeFileSync(join(folder,`design-${String(i+1).padStart(2,"0")}.svg`),stitchIrPreview(d.stitchObjects??[],d.physicalSizeMm?.width??250,d.physicalSizeMm?.height??60));
  writeFileSync(join(folder,`design-${String(i+1).padStart(2,"0")}.concept.svg`),d.svg);
  writeFileSync(join(folder,`design-${String(i+1).padStart(2,"0")}.stitch-ir.json`),JSON.stringify(d.stitchObjects,null,2));
 }
 const summary={suite:suite.name,requested:10,produced:accepted.length,failures,diagnostics,designs:accepted.map((d,i)=>({file:`design-${String(i+1).padStart(2,"0")}.svg`,id:d.id,score:d.score,novelty:d.novelty,manufacturingStatus:"stitch-ir-preview-not-machine-validated",stitchObjectCount:d.stitchObjects?.length??0,physicalSizeMm:d.physicalSizeMm}))};
 writeFileSync(join(folder,"manifest.json"),JSON.stringify(summary,null,2));
 results.push(summary);
 if(accepted.length<10)failureCount++;
 process.stdout.write(`${suite.name}: ${accepted.length}/10 generated; batches=${diagnostics.length}; errors=${failures.length}\n`);
 if(accepted.length<10)process.stderr.write(`${suite.name}: ${failures.slice(0,8).join(" | ") || "not enough unique viable candidates"}\n`);
}
writeFileSync(join(dir,"evaluation-summary.json"),JSON.stringify(results,null,2));
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const gallery=(results as {suite:string;produced:number;designs:{file:string;score:number;stitchObjectCount:number}[]}[]).map(group=>
 `<section><h2>${esc(group.suite)} — ${group.produced}/10</h2><div class="grid">`+
 group.designs.map(d=>`<article><img loading="lazy" src="${encodeURIComponent(group.suite)}/${encodeURIComponent(d.file)}" alt="Pattern preview"><p>${esc(d.file)} · score ${d.score.toFixed(1)} · ${d.stitchObjectCount} stitch objects</p></article>`).join("")+
 "</div></section>").join("");
writeFileSync(join(dir,"index.html"),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tesseract 40-design evaluation</title><style>body{font:16px system-ui;background:#121925;color:#f0ebe0;margin:24px}h1{font-size:2rem}h2{margin-top:2rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}article{background:#263143;padding:12px;border-radius:12px}img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#eee}p{font-size:13px}</style><h1>Tesseract evaluation — digital previews only</h1><p>These SVGs are not proof of stitch-layout equivalence or factory approval. Inspect the JSON stitch data before any sew-out.</p>${gallery}</html>`);

if(failureCount)process.exitCode=1;
