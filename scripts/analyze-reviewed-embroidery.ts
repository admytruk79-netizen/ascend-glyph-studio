/** Offline image pilot: explicitly reviewed corpus records + local image files.
 * No remote image fetching or automatic rights approval.
 * Usage: CORPUS_IN=... IMAGE_ROOT=... CORPUS_ANALYSIS_OUT=... npx tsx scripts/analyze-reviewed-embroidery.ts
 */
import {createReadStream,createWriteStream} from "node:fs";
import {createInterface} from "node:readline";
import {resolve,relative,isAbsolute} from "node:path";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {analyzeReviewedReferences,type ReviewedImage} from "../packages/tesseract-engine/src/reviewed-image-pipeline";
type Input={id:string;source?:string;objectURL?:string;imageFile?:string;objectFamilyId?:string;raw?:{institution?:string};rightsStatus?:string;culturalReview?:string;backgroundRgb?:[number,number,number]};
const input=process.env.CORPUS_IN??"data/research/reviewed-embroidery.ndjson";
const root=resolve(process.env.IMAGE_ROOT??"data/research/images");
const output=process.env.CORPUS_ANALYSIS_OUT??"data/research/embroidery-analysis.ndjson";
const max=Number(process.env.CORPUS_ANALYSIS_LIMIT??100);
if(!Number.isInteger(max)||max<1||max>10000)throw Error("Invalid CORPUS_ANALYSIS_LIMIT");
async function main(){
 const out=createWriteStream(output,{flags:"w"});
 const records:ReviewedImage[]=[];
 const errors:{objectId:string;reason:string}[]=[];
 const rl=createInterface({input:createReadStream(input),crlfDelay:Infinity});
 for await(const line of rl){
  if(!line.trim())continue;
  let r:Input;
  try{r=JSON.parse(line) as Input;}catch{errors.push({objectId:"unknown",reason:"invalid-json"});continue;}
  if(records.length>=max)break;
  if(r.rightsStatus!=="approved"||r.culturalReview!=="approved"){errors.push({objectId:r.id,reason:"approval-required"});continue;}
  if(!r.imageFile||!r.objectURL||!r.id||!r.objectFamilyId||!r.raw?.institution){errors.push({objectId:r.id??"unknown",reason:"missing-provenance-or-image-file"});continue;}
  const path=resolve(root,r.imageFile);
  if(isAbsolute(r.imageFile)||relative(root,path).startsWith("..")||relative(root,path)===""){errors.push({objectId:r.id,reason:"image-outside-root"});continue;}
  try{
   const bytes=await readFile(path);
   if(bytes.length>15_000_000)throw Error("image-too-large");
   const {data,info}=await sharp(bytes,{limitInputPixels:12_000_000}).resize({width:512,height:512,fit:"inside",withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(info.channels!==4)throw Error("unexpected-image-channels");
   records.push({reference:{objectId:r.id,institution:r.raw.institution,objectUrl:r.objectURL,imageSha256:createHash("sha256").update(bytes).digest("hex"),objectFamilyId:r.objectFamilyId,rightsStatus:"approved",culturalReview:"approved"},frame:{width:info.width,height:info.height,rgba:data},backgroundRgb:r.backgroundRgb??[255,255,255]});
  }catch(e){errors.push({objectId:r.id,reason:e instanceof Error?e.message:"image-decode-failed"});}
 }
 const result=analyzeReviewedReferences(records);
 for(const entry of result.analyzed)out.write(JSON.stringify({objectId:entry.reference.objectId,reference:entry.reference,structure:entry.imageStructure})+"\n");
 await new Promise<void>((ok,fail)=>{out.on("error",fail);out.end(ok);});
 console.log(JSON.stringify({input,output,analyzed:result.analyzed.length,rules:result.extraction.rules,excluded:result.extraction.excluded,errors:[...errors,...result.errors]}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
