export interface Point { x: number; y: number; }
export interface PlacementZone {
  id: string;
  name: string;
  polygonMm: Point[];
  seamExclusionMm: number;
  maxEmbroideryWidthMm?: number;
  maxEmbroideryHeightMm?: number;
}
export interface GarmentSize {
  code: string;
  measurementsMm: Record<string, number>;
  toleranceMm: Record<string, number>;
  zones: PlacementZone[];
}
export interface GarmentSpec {
  id: string;
  styleId: string;
  revision: number;
  name: string;
  silhouette: "mens" | "womens" | "unisex";
  sizes: GarmentSize[];
  materialIds: string[];
  productionStatus: "development" | "sampled" | "approved";
}
