export type Matrix = readonly [number, number, number, number, number, number];

export interface SourceGlyphRef {
  glyphId: string;
  sourceVersion: number;
}

export interface Layer {
  source: SourceGlyphRef;
  transform: Matrix;
  z: number;
}

export interface DerivedGlyphRecipe {
  id: string;
  version: number;
  layers: readonly Layer[];
}

/**
 * A derived glyph is a composition of immutable source geometry.
 * No operation is permitted to rewrite source SVG path data.
 */
export function stack(id: string, layers: readonly Layer[]): DerivedGlyphRecipe {
  if (!layers.length) throw new Error("A derived glyph requires at least one source layer");
  return Object.freeze({
    id,
    version: 1,
    layers: Object.freeze([...layers].sort((a,b) => a.z - b.z))
  });
}

export const identity = (): Matrix => [1,0,0,1,0,0];
export const translate = (x:number,y:number): Matrix => [1,0,0,1,x,y];
export const scale = (s:number): Matrix => [s,0,0,s,0,0];
export const rotate = (degrees:number): Matrix => {
  const r=degrees*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  return [c,s,-s,c,0,0];
};
export const mirrorX = (): Matrix => [-1,0,0,1,0,0];
export const mirrorY = (): Matrix => [1,0,0,-1,0,0];
