export type GarmentZoneId="body-front"|"body-back"|"left-sleeve"|"right-sleeve"|"left-cuff"|"right-cuff"|"collar"|"placket"|"hem";
export type PatternMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export interface GarmentZone{mesh:string;uvSet:number;repeat:[number,number];rotation:number;production:"embroidery"|"print"|"either"}
export const GARMENT_ZONES:Record<GarmentZoneId,GarmentZone>={
"body-front":{mesh:"BodyFront",uvSet:0,repeat:[1,1],rotation:0,production:"either"},"body-back":{mesh:"BodyBack",uvSet:0,repeat:[1,1],rotation:0,production:"either"},
"left-sleeve":{mesh:"Sleeve_L",uvSet:0,repeat:[1,2],rotation:0,production:"either"},"right-sleeve":{mesh:"Sleeve_R",uvSet:0,repeat:[1,2],rotation:0,production:"either"},
"left-cuff":{mesh:"Cuff_L",uvSet:0,repeat:[2,1],rotation:0,production:"embroidery"},"right-cuff":{mesh:"Cuff_R",uvSet:0,repeat:[2,1],rotation:0,production:"embroidery"},
"collar":{mesh:"Collar",uvSet:0,repeat:[3,1],rotation:0,production:"embroidery"},"placket":{mesh:"Placket",uvSet:0,repeat:[1,4],rotation:0,production:"embroidery"},"hem":{mesh:"BodyFront",uvSet:0,repeat:[2,1],rotation:0,production:"either"}};
export const MODE_ZONE:Record<PatternMode,GarmentZoneId>={band:"hem",field:"body-front",emblem:"body-front",sleeve:"right-sleeve",cuff:"right-cuff",collar:"collar"};
export function validateGarmentAsset(meshNames:string[]){const required=[...new Set(Object.values(GARMENT_ZONES).map(z=>z.mesh))];return required.filter(x=>!meshNames.includes(x))}
