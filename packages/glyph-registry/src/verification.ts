export type GeometryVerificationStatus =
  | "pending"
  | "needs-review"
  | "geometry-verified"
  | "canonical-digital";

export interface GeometryVerification {
  glyphId: string;
  sourceAtlas: "earth" | "water" | "fire" | "air" | "spirit";
  sourceFragment: string;
  sourceBoundsPx: [number, number, number, number];
  normalizedViewBox: [number, number, number, number];
  status: GeometryVerificationStatus;
  checks: {
    silhouette: boolean;
    proportions: boolean;
    centerline: boolean;
    symmetry: boolean | null;
    negativeSpace: boolean;
    intersections: boolean;
    rasterArtifactsRemoved: boolean;
  };
  metrics?: {
    overlapIoU?: number;
    pixelDifference?: number;
  };
  notes?: string[];
}

export function canPromoteToCanonical(v: GeometryVerification): boolean {
  const c = v.checks;
  return v.status === "geometry-verified" &&
    c.silhouette && c.proportions && c.centerline &&
    c.negativeSpace && c.intersections && c.rasterArtifactsRemoved;
}
