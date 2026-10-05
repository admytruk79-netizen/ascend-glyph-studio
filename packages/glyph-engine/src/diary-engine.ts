import { createHash } from "node:crypto";
import { DiarySynthesisInput } from "./diary";
import { synthesizeDiaryVector } from "./diary-vector";
import { A5_DIARY_ZONES, DiaryZoneName, DiaryZoneSpec } from "./diary-family";

export interface SynthesisAdapter<TInput,TResult>{kind:string;run(input:TInput):TResult}
export interface DiaryExport { zone:DiaryZoneName; filename:string; svg:string }
export interface DiaryEngineResult {id:string;manifestSha256:string;exports:DiaryExport[];validation:{valid:boolean;errors:string[]}}

const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));
function zonePaths(zone:DiaryZoneName,paths:string[]){
 if(zone==="cover")return paths;
 if(zone==="border")return paths.slice(-1);
 if(zone==="spine")return paths.slice(0,1);
 if(zone==="divider")return paths.slice(0,Math.max(2,Math.floor(paths.length/2)));
 return paths.slice(0,3);
}
function project(zone:DiaryZoneSpec,paths:string[],hash:string){
 const canonicalW=210,canonicalH=297;
 const usableW=Math.max(0,zone.widthMm-zone.safeInsetMm*2);
 const usableH=Math.max(0,zone.heightMm-zone.safeInsetMm*2);
 const scale=Math.min(usableW/canonicalW,usableH/canonicalH);
 const tx=(zone.widthMm-canonicalW*scale)/2,ty=(zone.heightMm-canonicalH*scale)/2;
 const projection={zone:zone.name,manifestSha256:hash,widthMm:zone.widthMm,heightMm:zone.heightMm,safeInsetMm:zone.safeInsetMm,scale:+scale.toFixed(8),translateMm:[+tx.toFixed(4),+ty.toFixed(4)]};
 const body=paths.map(d=>`<path d="${esc(d)}"/>`).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.widthMm}mm" height="${zone.heightMm}mm" viewBox="0 0 ${zone.widthMm} ${zone.heightMm}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"><metadata>${esc(JSON.stringify(projection))}</metadata><g transform="translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${scale.toFixed(8)})" vector-effect="non-scaling-stroke">${body}</g></svg>`;
}
function validateProjectedSvg(zone:DiaryZoneSpec,svg:string,hash:string,expectedPaths:number){
 const errors:string[]=[];
 if(!svg.startsWith("<svg"))errors.push(`${zone.name}: invalid svg root`);
 if(!svg.includes(`width="${zone.widthMm}mm"`)||!svg.includes(`height="${zone.heightMm}mm"`))errors.push(`${zone.name}: physical dimensions mismatch`);
 if(!svg.includes(`viewBox="0 0 ${zone.widthMm} ${zone.heightMm}"`))errors.push(`${zone.name}: viewBox mismatch`);
 if(!svg.includes(hash))errors.push(`${zone.name}: missing manifest provenance hash`);
 if((svg.match(/<path /g)||[]).length!==expectedPaths)errors.push(`${zone.name}: projected path count mismatch`);
 if(/NaN|Infinity/.test(svg))errors.push(`${zone.name}: non-finite projection`);
 return errors;
}
export function runDiaryEngine(input:DiarySynthesisInput):DiaryEngineResult{
 const candidate=synthesizeDiaryVector(input),errors:string[]=[];
 if(!candidate.paths.length)errors.push("no vector geometry");
 if(!candidate.manifest.principles.length)errors.push("missing evidence-backed principle");
 if(!candidate.manifest.meanings.length)errors.push("missing semantic intent");
 const exports=A5_DIARY_ZONES.map(zone=>{const paths=zonePaths(zone.name,candidate.paths),svg=project(zone,paths,candidate.manifestSha256);errors.push(...validateProjectedSvg(zone,svg,candidate.manifestSha256,paths.length));return{zone:zone.name,filename:`${zone.name}-${candidate.manifestSha256.slice(0,12)}.svg`,svg}});
 const packageHash=createHash("sha256").update(exports.map(x=>x.svg).join("\n")).digest("hex");
 return{id:`diary-${packageHash.slice(0,12)}`,manifestSha256:candidate.manifestSha256,exports,validation:{valid:!errors.length,errors}};
}
export const diaryAdapter:SynthesisAdapter<DiarySynthesisInput,DiaryEngineResult>={kind:"diary",run:runDiaryEngine};
