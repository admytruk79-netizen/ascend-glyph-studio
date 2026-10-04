import { createHash } from "node:crypto";
import { DiaryEngineResult } from "./diary-engine";

export interface DiaryApprovalState {
  designVersionId?: string;
  humanApproved: boolean;
  culturalReview: "not-required" | "pending" | "approved" | "rejected";
  originalityReview: "pending" | "approved" | "rejected";
  physicalValidation: "pending" | "approved" | "rejected";
}

export interface DiaryProductionPackage {
  schema: "ascend.diary.production.v1";
  engineResultId: string;
  manifestSha256: string;
  assets: { zone: string; filename: string; sha256: string }[];
  approval: DiaryApprovalState;
  productEngineBridge: null | {
    designVersionId: string;
    artwork: { zone: string; filename: string; sha256: string }[];
    validationState: "production-approved";
  };
}

const sha=(value:string)=>createHash("sha256").update(value).digest("hex");

export function buildDiaryProductionPackage(
  result: DiaryEngineResult,
  approval: DiaryApprovalState
): DiaryProductionPackage {
  if (!result.validation.valid) throw new Error("invalid diary engine result cannot be packaged");

  const assets=result.exports.map(asset=>({
    zone:asset.zone,
    filename:asset.filename,
    sha256:sha(asset.svg)
  }));

  const approved=
    approval.humanApproved &&
    approval.culturalReview!=="pending" &&
    approval.culturalReview!=="rejected" &&
    approval.originalityReview==="approved" &&
    approval.physicalValidation==="approved";

  if (approved && !approval.designVersionId?.trim()) {
    throw new Error("production-approved diary requires a designVersionId");
  }

  return {
    schema:"ascend.diary.production.v1",
    engineResultId:result.id,
    manifestSha256:result.manifestSha256,
    assets,
    approval,
    productEngineBridge:approved ? {
      designVersionId:approval.designVersionId!.trim(),
      artwork:assets,
      validationState:"production-approved"
    } : null
  };
}
