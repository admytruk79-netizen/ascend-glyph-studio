export interface ManufacturerCapability {
  manufacturerId: string;
  embroiderySupported: boolean;
  maxHoopWidthMm?: number;
  maxHoopHeightMm?: number;
  maxThreadColors?: number;
  minStitchWidthMm?: number;
  supportedFabrics: string[];
  supportedProcesses: string[];
  acceptedArtworkFormats: string[];
}

export interface ValidationIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  subjectId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
