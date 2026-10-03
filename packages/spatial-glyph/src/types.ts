export type Vec3=readonly [number,number,number];
export type Vec4=readonly [number,number,number,number];
export type Quaternion=readonly [number,number,number,number];

export interface CanonicalGlyphRef { glyphId:string; version:string; assetKey:string; }
export interface SpatialRecipe {
 version:string; depth:number; bevel:number; curveSegments:number;
}
export interface SpatialGlyph {
 source:CanonicalGlyphRef;
 recipe:SpatialRecipe;
}
export interface TesseractInstance {
 id:string;
 glyph:SpatialGlyph;
 position4:Vec4;
 rotation:Quaternion;
 scale:number;
 relationship?:string;
 parentId?:string;
}
export interface Projection4Dto3D {
 kind:"orthographic-w"|"perspective-w";
 wDistance?:number;
}
