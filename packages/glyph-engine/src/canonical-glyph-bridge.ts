import {CanonicalArtwork,hashCanonicalArtwork} from "./canonical-artwork";

export interface CanonicalGlyphRecord{
 id:string;sourceVersion:number;vectorAssetKey:string;
 status:"source-raster-approved"|"geometry-verified"|"canonical-digital";
 vectorStatus:"needs-review"|"geometry-verified";
}
export interface VerifiedVectorAsset{
 assetKey:string;viewBox:{x:number;y:number;width:number;height:number};
 polygons:{x:number;y:number}[][];minLineUnits:number;minGapUnits:number;
}
export class CanonicalGlyphAssetUnavailableError extends Error{
 constructor(id:string,key:string){super(`Verified canonical vector asset unavailable for ${id}: ${key}`);this.name="CanonicalGlyphAssetUnavailableError";}
}
export function canonicalArtworkFromGlyph(record:CanonicalGlyphRecord,asset?:VerifiedVectorAsset):CanonicalArtwork{
 if(record.status!=="canonical-digital"||record.vectorStatus!=="geometry-verified")throw new Error(`Glyph ${record.id} has not passed canonical vector verification`);
 if(!asset||asset.assetKey!==record.vectorAssetKey)throw new CanonicalGlyphAssetUnavailableError(record.id,record.vectorAssetKey);
 const raw={id:record.id,revision:String(record.sourceVersion),viewBox:asset.viewBox,polygons:asset.polygons,minLineUnits:asset.minLineUnits,minGapUnits:asset.minGapUnits};
 return{...raw,sourceHash:hashCanonicalArtwork(raw)};
}
