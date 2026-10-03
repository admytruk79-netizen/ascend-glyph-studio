export const GLYPH_COUNTS={earth:9,water:5,fire:6,air:6,spirit:6} as const;
export const FIRE_NAMES=["Rising Rays","Split Chevrons","Central Core","Expanding Lines","Ascending Path","Ignition Point"] as const;
export type GlyphFamily=keyof typeof GLYPH_COUNTS;
export type GlyphStatus="source-raster-approved"|"geometry-verified"|"canonical-digital";
export type GlyphRecord=Readonly<{
 id:string;family:GlyphFamily;sourceIndex:number;sourceVersion:1;displayName:string|null;immutable:true;
 sourceRasterKey:string;vectorAssetKey:string;status:GlyphStatus;vectorStatus:"needs-review"|"geometry-verified";
}>;
export const glyphRegistry:GlyphRecord[]=Object.entries(GLYPH_COUNTS).flatMap(([family,count])=>Array.from({length:count},(_,i)=>{
 const id=`${family}-${String(i+1).padStart(2,"0")}`;
 const verified=id==="water-02"||id==="water-03";
 return {id,family:family as GlyphFamily,sourceIndex:i+1,sourceVersion:1,
  displayName:family==="fire"?FIRE_NAMES[i]:null,immutable:true,
  sourceRasterKey:`glyphs/${family}/${id}/source/v1.png`,
  vectorAssetKey:`glyphs/${family}/${id}/vector/v1.svg`,
  status:(verified?"canonical-digital":"source-raster-approved") as GlyphStatus,
  vectorStatus:(verified?"geometry-verified":"needs-review") as "geometry-verified"|"needs-review"};
}));
