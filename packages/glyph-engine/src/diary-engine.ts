import { createHash } from "node:crypto";
import { DiarySynthesisInput } from "./diary";
import { synthesizeDiaryVector } from "./diary-vector";
import { A5_DIARY_ZONES, DiaryZoneName } from "./diary-family";

export interface DiaryExport { zone:DiaryZoneName; filename:string; svg:string }
export interface DiaryEngineResult {
 id:string; manifestSha256:string; exports:DiaryExport[]; validation:{valid:boolean;errors:string[]};
}
const dims:Record<DiaryZoneName,[number,number]>={cover:[148,210],spine:[18,210],border:[148,210],divider:[148,210],emblem:[36,36]};
function wrap(zone:DiaryZoneName,body:string,hash:string){
 const [w,h]=dims[zone];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 210 297" fill="none" stroke="currentColor" stroke-width="1.6"><metadata>${zone}:${hash}</metadata><g vector-effect="non-scaling-stroke">${body}</g></svg>`;
}
function zoneBody(zone:DiaryZoneName,paths:string[]){
 const all=paths.map(d=>`<path d="${d}"/>`);
 if(zone==="cover") return all.join("");
 if(zone==="border") return all.at(-1)??"";
 if(zone==="spine") return all.slice(0,1).join("");
 if(zone==="divider") return all.slice(0,Math.max(2,Math.floor(all.length/2))).join("");
 return all.slice(0,3).join("");
}
export function runDiaryEngine(input:DiarySynthesisInput):DiaryEngineResult{
 const candidate=synthesizeDiaryVector(input),errors:string[]=[];
 if(!candidate.paths.length)errors.push("no vector geometry");
 if(candidate.manifest.principles.length<1)errors.push("missing evidence-backed principle");
 if(candidate.manifest.meanings.length<1)errors.push("missing semantic intent");
 const exports=A5_DIARY_ZONES.map(({name})=>({zone:name,filename:`${name}-${candidate.manifestSha256.slice(0,12)}.svg`,svg:wrap(name,zoneBody(name,candidate.paths),candidate.manifestSha256)}));
 const packageHash=createHash("sha256").update(exports.map(x=>x.svg).join("\n")).digest("hex");
 return{id:`diary-${packageHash.slice(0,12)}`,manifestSha256:candidate.manifestSha256,exports,validation:{valid:errors.length===0,errors}};
}
