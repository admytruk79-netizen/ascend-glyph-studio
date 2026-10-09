/**
 * Stream the FULL analyzed museum corpus into provenance-backed visual observations.
 * No image bytes or museum motifs are copied. Validation/holdout are excluded from
 * training; output is NDJSON to avoid retaining 32k+ objects in memory.
 *
 * CORPUS_MASTER_IN=data/research/master.ndjson
 * CORPUS_VISUAL_OUT=data/research/visual-learning.ndjson
 * CORPUS_VISUAL_SUMMARY=data/research/visual-learning-summary.json
 */
import {createReadStream,createWriteStream,writeFileSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {createInterface} from "node:readline";
import type {ImageObservation} from "../../packages/tesseract-engine/src/image-corpus.ts";
import {assignSplit,type AnalyzedRow} from "./store.ts";

type Row=AnalyzedRow & {culturalAccess?:string;stage?:string;region?:string;culture?:string;date?:string;title?:string;deconstruction?:any};
const clamp=(x:unknown,fallback=.5)=>typeof x==="number"&&Number.isFinite(x)?Math.max(0,Math.min(1,x)):fallback;
const input=process.env.CORPUS_MASTER_IN??"data/research/master.ndjson";
const output=process.env.CORPUS_VISUAL_OUT??"data/research/visual-learning.ndjson";
const summaryPath=process.env.CORPUS_VISUAL_SUMMARY??"data/research/visual-learning-summary.json";
const banned=(r:Row)=>["review","restricted","structure-excluded","no-access","sacred","ceremonial","funerary"].includes(String(r.culturalAccess??"").toLowerCase());
export function visualObservationFromAnalyzed(r:Row):ImageObservation|null{
 if(!r.id||!r.source||!r.features||!r.deconstruction||(r.stage!==undefined&&r.stage!=="analyzed")||!r.image||!r.dhash||!r.analyzerVersion||!r.objectURL||banned(r))return null;
 const d=r.deconstruction,f=r.features as Record<string,unknown>;
 const bands=Array.isArray(d.bands)?d.bands:[];
 const best=bands.reduce((a:any,b:any)=>!a||(b.periodicity??0)>(a.periodicity??0)?b:a,null);
 const breaks=best?.breaks??d.fieldBreaks;
 const kind=d.kind;
 const operations:string[]=[];
 if(best?.periodicity>.3||d.repeat?.kind!=="none"&&d.repeat?.kind)operations.push("repeat");
 if(best?.frieze?.scores?.vertical>.5||best?.frieze?.scores?.horizontal>.5)operations.push("mirror");
 if(breaks?.ratio>.08)operations.push("interrupt");
 if(d.rosette?.order>1||d.wallpaper?.rotationOrder>1)operations.push("rotate");
 const directions:NonNullable<ImageObservation["features"]["dominantDirection"]>=[];
 if(kind==="frieze"||kind==="mixed")directions.push("horizontal");
 if(kind==="field"||kind==="mixed")directions.push("field");
 if(d.rosette)directions.push("radial");
 const edge=clamp(f.edgeDensity,.4);
 const observation:ImageObservation={
  id:"museum:"+r.source+":"+r.id,sourceRef:r.objectURL??r.source+":"+r.id,
  class:"real-historical",evidenceTier:"B",verifiedReal:true,trainingUse:"composition",
  provenance:JSON.stringify({source:r.source,accession:r.accession,institution:r.institution,tradition:r.tradition,region:r.region,date:r.date,analyzerVersion:r.analyzerVersion,split:r.split??assignSplit(r)}),
  features:{
   symmetry:clamp(Math.max(Number(f.mirrorX??0),Number(f.mirrorY??0))),
   density:edge,voidRatio:clamp(f.voidRatio),scaleLevels:Array.isArray(f.scaleHierarchy)?f.scaleHierarchy.length:1,
   densityVariation:clamp(f.densityVariation),axisStrength:clamp(f.axisStrength),periodicity:clamp(best?.periodicity??Math.max(Number(f.repetitionX??0),Number(f.repetitionY??0)),0),
   rotation180:clamp(f.rotation180,0),
   dominantDirection:directions,operations,

   compositionalDepth:clamp((bands.length+Number(Boolean(d.wallpaper))+Number(Boolean(d.rosette)))/6),
   materials:[],techniques:[],
  },
  notes:["Structure-only learning; never copy museum motif geometry.","Image analyzed upstream; this record contains measurements and provenance only."]
 };
 return observation;
}
async function main(){
 mkdirSync(dirname(output),{recursive:true});
 mkdirSync(dirname(summaryPath),{recursive:true});
 const stream=createWriteStream(output,{flags:"w"});
 const stats={read:0,eligible:0,train:0,validation:0,holdout:0,excluded:0,byTradition:{} as Record<string,number>,bySource:{} as Record<string,number>};
 for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
  if(!line.trim())continue;stats.read++;
  const r=JSON.parse(line) as Row,split=r.split??assignSplit(r);
  if(!["train","validation","holdout"].includes(split))throw new Error("Invalid corpus split for "+r.id);
  const obs=visualObservationFromAnalyzed(r);
  if(!obs){stats.excluded++;continue;}
  stats.eligible++;
  if(split==="validation"){stats.validation++;continue;}
  if(split==="holdout"){stats.holdout++;continue;}
  stats.train++;
  const tradition=r.tradition??"unattributed";stats.byTradition[tradition]=(stats.byTradition[tradition]??0)+1;
  stats.bySource[r.source]=(stats.bySource[r.source]??0)+1;
  if(!stream.write(JSON.stringify(obs)+"\n"))await new Promise<void>(resolve=>stream.once("drain",resolve));
 }
 await new Promise<void>(resolve=>stream.end(resolve));
 writeFileSync(summaryPath,JSON.stringify(stats,null,2));
 console.log(JSON.stringify(stats));
 if(!stats.train)throw new Error("No verified train observations; corpus missing or filtered");
}
if(process.argv[1]?.includes("export-visual-learning"))main().catch(e=>{console.error(e);process.exitCode=1});
