/**
 * Train motif shape clusters from an explicitly licensed local image manifest.
 * Reuses learnImage(), featureOf(), kmeans(), prototypeShape() from ./learn.ts.
 * No museum-image downloading and no use of validation/holdout for fitting.
 *
 * Manifest NDJSON: {"id":"...", "imagePath":"assets/licensed/a.png",
 * "tradition":"Ukraine","split":"train","rightsApproved":true}
 *
 * Run: npx tsx scripts/train/train-motifs-from-manifest.ts manifest.ndjson model.json
 */
import {createReadStream,writeFileSync,mkdirSync} from "node:fs";
import {createInterface} from "node:readline";
import {dirname,resolve} from "node:path";
import sharp from "sharp";
import {learnImage,featureOf,kmeans,prototypeShape,type Element} from "./learn.ts";
type Row={id:string;imagePath:string;tradition:string;split:string;rightsApproved:boolean};
const manifest=process.argv[2],output=process.argv[3];
if(!manifest||!output)throw new Error("Usage: tsx scripts/train/train-motifs-from-manifest.ts manifest.ndjson output.json");
const elements:Element[]=[];
const counts={read:0,trained:0,excluded:0,failed:0,validation:0,holdout:0};
const seen=new Set<string>();
for await(const line of createInterface({input:createReadStream(manifest),crlfDelay:Infinity})){
 if(!line.trim())continue;
 counts.read++;
 const r=JSON.parse(line) as Row;
 if(r.split==="validation"){counts.validation++;continue}
 if(r.split==="holdout"){counts.holdout++;continue}
 if(r.split!=="train"||!r.rightsApproved||!["Ukraine","Ukrainian"].includes(r.tradition)||!r.id||!r.imagePath||seen.has(r.id)){counts.excluded++;continue}
 seen.add(r.id);
 try{
  const img=sharp(resolve(r.imagePath)).rotate().resize({width:512,height:512,fit:"inside",withoutEnlargement:true}).removeAlpha().toColourspace("srgb");
  const {data,info}=await img.raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw new Error("Expected RGB");
  const result=learnImage({data,width:info.width,height:info.height},40);
  elements.push(...result.elements.filter(e=>e.area>.00005&&e.area<.3&&Number.isFinite(e.solidity)));
  counts.trained++;
 }catch(e){counts.failed++;console.error("Skipping",r.id,String(e))}
}
if(counts.trained<5||elements.length<20)throw new Error("Insufficient approved training images/motifs; refusing to publish model");
const vectors=elements.map(featureOf);
const {centers,assign}=kmeans(vectors,Math.min(24,Math.floor(elements.length/8)),20);
const codebook=centers.map((center,i)=>{
 const members=elements.filter((_,j)=>assign[j]===i);
 return {id:"motif-cluster-"+i,count:members.length,featureCenter:center.map(x=>+x.toFixed(5)),
  prototype:prototypeShape(members),meanSolidity:members.reduce((a,e)=>a+e.solidity,0)/members.length,
  meanMirror:members.reduce((a,e)=>a+e.mirror,0)/members.length};
}).filter(c=>c.count>=3);
const model={version:"ukrainian-motifs/1",status:"research-only-not-promoted",algorithm:"existing learnImage + Fourier featureOf + kmeans + prototypeShape",
 provenance:"approved local images only",counts,motifs:elements.length,codebook};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(model,null,2));
console.log(JSON.stringify({counts,clusters:codebook.length,motifs:elements.length,output}));
