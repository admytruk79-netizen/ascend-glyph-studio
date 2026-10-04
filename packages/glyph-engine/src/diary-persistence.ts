import { DiaryEngineResult } from "./diary-engine";
import { DiaryApprovalState, DiaryProductionPackage, buildDiaryProductionPackage } from "./diary-package";

export interface DiaryPersistenceRecord {
  synthesisCandidateId: string;
  designId: string;
  designVersion: number;
  manifestSha256: string;
  manifest: {
    schema: "ascend.diary.persist.v1";
    engineResultId: string;
    synthesisCandidateId: string;
    artwork: { zone: string; filename: string; sha256: string }[];
  };
  reviewGate: DiaryApprovalState;
  production: DiaryProductionPackage;
}

export function buildDiaryPersistenceRecord(args:{
  result: DiaryEngineResult;
  synthesisCandidateId: string;
  designId: string;
  designVersion: number;
  approval: Omit<DiaryApprovalState,"designVersionId">;
}):DiaryPersistenceRecord{
  if(!args.synthesisCandidateId.trim()) throw new Error("synthesisCandidateId is required");
  if(!args.designId.trim()) throw new Error("designId is required");
  if(!Number.isInteger(args.designVersion)||args.designVersion<1) throw new Error("designVersion must be a positive integer");

  const designVersionId=`${args.designId}:${args.designVersion}`;
  const reviewGate={...args.approval,designVersionId};
  const production=buildDiaryProductionPackage(args.result,reviewGate);

  return {
    synthesisCandidateId:args.synthesisCandidateId.trim(),
    designId:args.designId.trim(),
    designVersion:args.designVersion,
    manifestSha256:args.result.manifestSha256,
    manifest:{
      schema:"ascend.diary.persist.v1",
      engineResultId:args.result.id,
      synthesisCandidateId:args.synthesisCandidateId.trim(),
      artwork:production.assets
    },
    reviewGate,
    production
  };
}
