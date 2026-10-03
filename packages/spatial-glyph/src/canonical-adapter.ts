import type {CanonicalGlyphRef,SpatialGlyph,SpatialRecipe} from "./types";

export type RegistryGlyphLike=Readonly<{
 id:string; sourceVersion:number; vectorAssetKey:string;
 status:"source-raster-approved"|"geometry-verified"|"canonical-digital";
 vectorStatus:"needs-review"|"geometry-verified";
}>;

export class UnverifiedCanonicalGlyphError extends Error {
 constructor(id:string){super(`Glyph ${id} has not passed canonical vector verification`);this.name="UnverifiedCanonicalGlyphError";}
}

export function canonicalRef(record:RegistryGlyphLike):CanonicalGlyphRef {
 if(record.status!=="canonical-digital"||record.vectorStatus!=="geometry-verified") throw new UnverifiedCanonicalGlyphError(record.id);
 return Object.freeze({glyphId:record.id,version:String(record.sourceVersion),assetKey:record.vectorAssetKey});
}

export function spatialGlyph(record:RegistryGlyphLike,recipe:SpatialRecipe):SpatialGlyph {
 if(!Number.isFinite(recipe.depth)||recipe.depth<=0) throw new Error("depth must be finite and > 0");
 if(!Number.isFinite(recipe.bevel)||recipe.bevel<0) throw new Error("bevel must be finite and >= 0");
 if(!Number.isInteger(recipe.curveSegments)||recipe.curveSegments<1) throw new Error("curveSegments must be a positive integer");
 return Object.freeze({source:canonicalRef(record),recipe:Object.freeze({...recipe})});
}
