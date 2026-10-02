import type { GlyphFamily } from "../../glyph-registry/src/types";

export type CompositionMode = "border" | "path" | "field" | "emblem" | "composition";
export type ValidationState = "draft" | "digitally_valid" | "sample_required" | "sample_approved" | "production_approved";

export interface GlyphInstance {
  glyphId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
}

export interface DesignManifest {
  designId: string;
  version: number;
  seed: string;
  families: GlyphFamily[];
  mode: CompositionMode;
  garmentId: string;
  garmentSize: string;
  placementZoneId: string;
  materialId: string;
  manufacturerId?: string;
  glyphs: GlyphInstance[];
  validationState: ValidationState;
}
