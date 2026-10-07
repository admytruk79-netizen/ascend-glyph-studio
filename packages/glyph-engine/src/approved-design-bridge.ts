import { createHash } from "node:crypto";
import type { DiaryEngineResult } from "./diary-engine";

export interface ApprovedDesignBridgeRecord {
  schemaVersion:"1.0";
  designVersionId:string;
  artwork:ReadonlyArray<{zone:string;filename:string;sha256:string}>;
  manifestSha256:string;
  validationState:"production-validated";
}

export function toApprovedDesignBridge(designVersionId:string,result:DiaryEngineResult):ApprovedDesignBridgeRecord {
  if(!designVersionId.trim()) throw new Error("design version id required");
  if(!result.validation.valid) throw new Error("analytical validation required");
  if(!result.production.productionApproved||result.production.state!=="production-validated") {
    throw new Error("production approval required");
  }
  return {
    schemaVersion:"1.0",
    designVersionId,
    manifestSha256:result.manifestSha256,
    validationState:"production-validated",
    artwork:result.exports.map(x=>({
      zone:x.zone,
      filename:x.filename,
      sha256:createHash("sha256").update(x.svg).digest("hex")
    }))
  };
}
