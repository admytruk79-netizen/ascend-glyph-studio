export interface MaterialSpec {
  id: string;
  name: string;
  fiberContent: string;
  gsm?: number;
  weave?: string;
  usableWidthMm?: number;
  finish?: string;
  shrinkageWarpPct?: number;
  shrinkageWeftPct?: number;
  supplierId?: string;
  colorIds: string[];
  testStatus: "unverified" | "testing" | "approved";
}
