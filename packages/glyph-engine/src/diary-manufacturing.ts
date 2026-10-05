export type DiaryPaper="white"|"cream"|"premium-color"|"standard-color";
export interface DiaryManufacturingProfile {
 id:string; trimWidthMm:number; trimHeightMm:number; pageCount:number; paper:DiaryPaper;
 bleedMm:number; safeMm:number; foldVarianceMm:number; spineTextInsetMm:number;
 barcode:{widthMm:number;heightMm:number;insetMm:number}; minLineMm:number;
}
export interface DiaryManufacturingGeometry {
 profileId:string; trim:{widthMm:number;heightMm:number}; spineWidthMm:number;
 sheet:{widthMm:number;heightMm:number}; bleedMm:number; safeMm:number;
 folds:{leftMm:number;rightMm:number;varianceMm:number};
 barcodeExclusion:{xMm:number;yMm:number;widthMm:number;heightMm:number};
 minLineMm:number; spineTextAllowed:boolean;
}
const caliper:Record<DiaryPaper,number>={white:.0572,cream:.0635,"premium-color":.0596,"standard-color":.0572};
const r=(n:number)=>+n.toFixed(3);
export function deriveDiaryManufacturingGeometry(p:DiaryManufacturingProfile):DiaryManufacturingGeometry{
 if(p.pageCount<24)throw new Error("pageCount must be at least 24");
 if(p.trimWidthMm<=0||p.trimHeightMm<=0)throw new Error("invalid trim");
 const spine=r(p.pageCount*caliper[p.paper]);
 const width=r(p.bleedMm+p.trimWidthMm+spine+p.trimWidthMm+p.bleedMm);
 const height=r(p.bleedMm+p.trimHeightMm+p.bleedMm);
 const leftFold=r(p.bleedMm+p.trimWidthMm),rightFold=r(leftFold+spine);
 return{profileId:p.id,trim:{widthMm:p.trimWidthMm,heightMm:p.trimHeightMm},spineWidthMm:spine,
  sheet:{widthMm:width,heightMm:height},bleedMm:p.bleedMm,safeMm:p.safeMm,
  folds:{leftMm:leftFold,rightMm:rightFold,varianceMm:p.foldVarianceMm},
  barcodeExclusion:{xMm:r(p.bleedMm+p.barcode.insetMm),yMm:r(height-p.bleedMm-p.barcode.insetMm-p.barcode.heightMm),widthMm:p.barcode.widthMm,heightMm:p.barcode.heightMm},
  minLineMm:p.minLineMm,spineTextAllowed:p.pageCount>=79};
}
export const KDP_A5_CREAM_160:DiaryManufacturingProfile={
 id:"kdp-paperback-a5-cream-160",trimWidthMm:148,trimHeightMm:210,pageCount:160,paper:"cream",
 bleedMm:3.2,safeMm:6.4,foldVarianceMm:1.6,spineTextInsetMm:1.6,
 barcode:{widthMm:50.8,heightMm:30.5,insetMm:6.4},minLineMm:.3
};
