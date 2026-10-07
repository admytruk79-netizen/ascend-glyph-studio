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
 * Structural vocabulary used by the synthesis engine.
 * These are composition rules, not mutations of canonical glyph geometry.
 */
export type StructuralOperation =
  | "repeat"
  | "alternate"
  | "mirror"
  | "rotate"
  | "nest"
  | "interlock"
  | "branch"
  | "interrupt"
  | "expand"
  | "contract"
  | "radial"
  | "braid"
  | "lattice"
  | "frieze"
  | "medallion"
  | "field";

export type MaterialProcess =
  | "embroidery"
  | "weave"
  | "jacquard"
  | "applique"
  | "quilting"
  | "print"
  | "engraving"
  | "emboss"
  | "deboss"
  | "laser-cut"
  | "inlay"
  | "screen";

export type SurfaceCharacter =
  | "flat"
  | "raised"
  | "recessed"
  | "layered"
  | "openwork"
  | "textured"
  | "corded"
  | "satin"
  | "matte"
  | "relief";

export interface CompositionVocabulary {
  operations: readonly StructuralOperation[];
  hierarchyLevels: number;
  density: number;
  negativeSpace: number;
  rhythmVariation: number;
  interruption: number;
  asymmetry: number;
  layerDepth: number;
  scaleContrast: number;
}

export interface MaterialVocabulary {
  process: MaterialProcess;
  surface: SurfaceCharacter;
  substrateId?: string;
  threadOrLineWeight?: number;
  reliefDepthMm?: number;
  layerCount?: number;
}

export interface RichCompositionRecipe extends DerivedGlyphRecipe {
  structure: CompositionVocabulary;
  material: MaterialVocabulary;
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

export function richComposition(
  id: string,
  layers: readonly Layer[],
  structure: CompositionVocabulary,
  material: MaterialVocabulary
): RichCompositionRecipe {
  const base = stack(id, layers);
  if (!structure.operations.length) throw new Error("A rich composition requires structural operations");
  if (structure.hierarchyLevels < 1) throw new Error("hierarchyLevels must be >= 1");
  for (const [name, value] of Object.entries(structure)) {
    if (name === "operations" || name === "hierarchyLevels") continue;
    if (typeof value === "number" && (value < 0 || value > 1)) {
      throw new Error(`${name} must be between 0 and 1`);
    }
  }
  return Object.freeze({
    ...base,
    version: 2,
    structure: Object.freeze({...structure, operations:Object.freeze([...structure.operations])}),
    material: Object.freeze({...material})
  });
}

export const identity = (): Matrix => [1,0,0,1,0,0];
export const translate = (x:number,y:number): Matrix => [1,0,0,1,x,y];
export const scale = (s:number): Matrix => [s,0,0,s,0,0];
export const scaleXY = (x:number,y:number): Matrix => [x,0,0,y,0,0];
export const rotate = (degrees:number): Matrix => {
  const r=degrees*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  return [c,s,-s,c,0,0];
};
export const mirrorX = (): Matrix => [-1,0,0,1,0,0];
export const mirrorY = (): Matrix => [1,0,0,-1,0,0];
