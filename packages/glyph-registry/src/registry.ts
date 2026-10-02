export const GLYPH_COUNTS={earth:9,water:5,fire:6,air:6,spirit:6} as const;
export const FIRE_NAMES=["Rising Rays","Split Chevrons","Central Core","Expanding Lines","Ascending Path","Ignition Point"] as const;
export type GlyphFamily=keyof typeof GLYPH_COUNTS;
export type GlyphRecord=Readonly<{id:string;family:GlyphFamily;sourceIndex:number;sourceVersion:1;displayName:string|null;immutable:true;assetKey:string;status:"awaiting-exact-svg"|"canonical-digital"}>;
export const glyphRegistry:GlyphRecord[]=Object.entries(GLYPH_COUNTS).flatMap(([family,count])=>Array.from({length:count},(_,i)=>({
 id:`${family}-${String(i+1).padStart(2,"0")}`,
 family:family as GlyphFamily,sourceIndex:i+1,sourceVersion:1,
 displayName:family==="fire"?FIRE_NAMES[i]:null,immutable:true,
 assetKey:`glyphs/${family}/${family}-${String(i+1).padStart(2,"0")}/v1.svg`,
 status:"awaiting-exact-svg"
})));
