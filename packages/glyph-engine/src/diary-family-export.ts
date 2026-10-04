import { runDiaryEngine, DiaryEngineResult } from "./diary-engine";
import { DiarySynthesisInput } from "./diary";
import { buildDiaryFamily } from "./diary-family";
import { synthesizeDiaryVector } from "./diary-vector";

export interface DiaryFamilyExport {
 schema:"ascend.diary.family-export.v1";
 familyId:string;
 manifestSha256:string;
 seed:string;
 surfaces:{zone:string;filename:string;svg:string}[];
 validation:{
  valid:boolean;
  errors:string[];
  surfaceCount:number;
  uniqueSurfaceNames:boolean;
  safeGeometry:boolean;
  minLineMm:number;
  maxInkCoverage:number;
 };
}

export function exportDiaryFamily(input:DiarySynthesisInput):DiaryFamilyExport{
 const vector=synthesizeDiaryVector(input);
 const family=buildDiaryFamily(vector);
 const result:DiaryEngineResult=runDiaryEngine(input);
 const names=result.exports.map(x=>x.zone);
 const uniqueSurfaceNames=new Set(names).size===family.zones.length;
 const safeGeometry=family.zones.every(z=>z.widthMm>z.safeInsetMm*2&&z.heightMm>z.safeInsetMm*2);
 const errors=[...result.validation.errors];
 if(result.exports.length!==family.zones.length)errors.push("incomplete diary surface family");
 if(!uniqueSurfaceNames)errors.push("duplicate diary surface");
 if(!safeGeometry)errors.push("unsafe diary zone geometry");
 return{
  schema:"ascend.diary.family-export.v1",
  familyId:family.id,
  manifestSha256:result.manifestSha256,
  seed:input.seed,
  surfaces:result.exports,
  validation:{
   valid:result.validation.valid&&!errors.length,
   errors,
   surfaceCount:result.exports.length,
   uniqueSurfaceNames,
   safeGeometry,
   minLineMm:family.designRules.minLineMm,
   maxInkCoverage:family.designRules.maxInkCoverage
  }
 };
}
