import { createHash } from "node:crypto";
import { DiarySynthesisInput } from "./diary";
import { synthesizeDiaryVector } from "./diary-vector";
import { A5_DIARY_ZONES, DiaryZoneName, DiaryZoneSpec } from "./diary-family";

export interface SynthesisAdapter<TInput,TResult>{kind:string;run(input:TInput):TResult}
export interface DiaryExport { zone:DiaryZoneName; filename:string; svg:string }
export interface DiaryEngineResult {id:string;manifestSha256:string;exports:DiaryExport[];validation:{valid:boolean;errors:string[]}}

function zoneBody(zone:DiaryZoneName,paths:string[]){
 const all=paths.map(d=>`<path d="${d}"/>`);
 if(zone==="cover")return all.join("");
 if(zone==="border")return all.at(-1)??"";
 if(zone==="spine")return all.slice(0,1).join("");
 if(zone==="divider")return all.slice(0,Math.max(2,Math.floor(all.length/2))).join("");
 return all.slice(0,3).join("");
}

function project(zone:DiaryZoneSpec,body:string,hash:string){
 const canonicalW=210,canonicalH=297;
 const usableW=Math.max(0,zone.widthMm-zone.safeInsetMm*2);
 const usableH=Math.max(0,zone.heightMm-zone.safeInsetMm*2);
 const scale=Math.min(usableW/canonicalW,usableH/canonicalH);
 const tx=(zone.widthMm-canonicalW*scale)/2;
 const ty=(zone.heightMm-canonicalH*scale)/2;
 const projection={zone:zone.name,manifestSha256:hash,widthMm:zone.widthMm,heightMm:zone.heightMm,safeInsetMm:zone.safeInsetMm,scale:+scale.toFixed(8),translateMm:[+tx.toFixed(4),+ty.toFixed(4)]};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.widthMm}mm" height="${zone.heightMm}mm" viewBox="0 0 ${zone.widthMm} ${zone.heightMm}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"><metadata>${JSON.stringify(projection)}</metadata><g transform="translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${scale.toFixed(8)})" vector-effect="non-scaling-stroke">${body}</g></svg>`;
}

export function runDiaryEngine(input:DiarySynthesisInput):DiaryEngineResult{
 const candidate=synthesizeDiaryVector(input),errors:string[]=[];
 if(!candidate.paths.length)errors.push("no vector geometry");
 if(!candidate.manifest.principles.length)errors.push("missing evidence-backed principle");
 if(!candidate.manifest.meanings.length)errors.push("missing semantic intent");
 const exports=A5_DIARY_ZONES.map(zone=>({zone:zone.name,filename:`${zone.name}-${candidate.manifestSha256.slice(0,12)}.svg`,svg:project(zone,zoneBody(zone.name,candidate.paths),candidate.manifestSha256)}));
 const packageHash=createHash("sha256").update(exports.map(x=>x.svg).join("\n")).digest("hex");
 return{id:`diary-${packageHash.slice(0,12)}`,manifestSha256:candidate.manifestSha256,exports,validation:{valid:!errors.length,errors}};
}
export const diaryAdapter:SynthesisAdapter<DiarySynthesisInput,DiaryEngineResult>={kind:"diary",run:runDiaryEngine};
