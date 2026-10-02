export type GlyphFamily = "earth" | "water" | "fire" | "air" | "spirit";

export interface GlyphRecord {
  id: string;
  family: GlyphFamily;
  name: string;
  version: number;
  svgAsset: string;
  sha256?: string;
  canonical: boolean;
  allowedTransforms: {
    rotate: boolean;
    mirrorX: boolean;
    mirrorY: boolean;
    minScale: number;
    maxScale: number;
  };
  production: {
    sampleStatus: "untested" | "testing" | "approved" | "rejected";
    minPhysicalWidthMm?: number;
    minStrokeMm?: number;
  };
}
