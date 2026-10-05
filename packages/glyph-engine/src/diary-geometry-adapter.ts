import {A5_DIARY_ZONES} from "./diary-family";
import {ProductGeometryAdapter,ProductGeometry} from "./product-geometry";

const rect=(w:number,h:number)=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
export const diaryGeometryAdapter:ProductGeometryAdapter<void>={
 kind:"bound-object",
 geometry():ProductGeometry{
  return{productKind:"bound-object",sourceId:"ascend-reference-a5-diary",revision:"1",zones:A5_DIARY_ZONES.map(z=>({
   id:z.name,surface:z.name==="spine"?"folded":"flat",outline:rect(z.widthMm,z.heightMm),safeInsetMm:z.safeInsetMm
  }))};
 }
};
