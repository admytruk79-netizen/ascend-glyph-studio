import { DiaryVectorCandidate } from "./diary-vector";

export type DiaryZoneName="cover"|"spine"|"border"|"divider"|"emblem";
export interface DiaryZoneSpec { name:DiaryZoneName; widthMm:number; heightMm:number; safeInsetMm:number; role:string }
export interface DiaryFamily {
 id:string;
 manifestSha256:string;
 zones:DiaryZoneSpec[];
 designRules:{maxInkCoverage:number;minLineMm:number;preserveNegativeSpace:boolean};
}

export const A5_DIARY_ZONES:DiaryZoneSpec[]=[
 {name:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"primary hierarchy"},
 {name:"spine",widthMm:18,heightMm:210,safeInsetMm:3,role:"compressed identity"},
 {name:"border",widthMm:148,heightMm:210,safeInsetMm:8,role:"rhythm and enclosure"},
 {name:"divider",widthMm:148,heightMm:210,safeInsetMm:14,role:"secondary cadence"},
 {name:"emblem",widthMm:36,heightMm:36,safeInsetMm:4,role:"recognition mark"}
];

export function buildDiaryFamily(candidate:DiaryVectorCandidate):DiaryFamily{
 return{
  id:`diary-${candidate.manifestSha256.slice(0,12)}`,
  manifestSha256:candidate.manifestSha256,
  zones:A5_DIARY_ZONES,
  designRules:{maxInkCoverage:.35,minLineMm:.35,preserveNegativeSpace:true}
 };
}
