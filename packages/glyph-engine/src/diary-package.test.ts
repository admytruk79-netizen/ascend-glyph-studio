import { strict as assert } from "node:assert";
import { runDiaryEngine } from "./diary-engine";
import { buildDiaryProductionPackage } from "./diary-package";

const result=runDiaryEngine({
  seed:"ascend-diary-package-001",
  meanings:["lineage","journey"],
  principles:["axis","rhythm"],
  density:"balanced",
  symmetry:"bilateral"
});

const pending=buildDiaryProductionPackage(result,{
  humanApproved:false,
  culturalReview:"pending",
  originalityReview:"pending",
  physicalValidation:"pending"
});
assert.equal(pending.productEngineBridge,null);
assert.equal(pending.assets.length,5);
assert.deepEqual(pending.assets.map(x=>x.zone),["cover","spine","border","divider","emblem"]);
for(const asset of pending.assets) assert.match(asset.sha256,/^[a-f0-9]{64}$/);

const approved=buildDiaryProductionPackage(result,{
  designVersionId:"design-version-42",
  humanApproved:true,
  culturalReview:"not-required",
  originalityReview:"approved",
  physicalValidation:"approved"
});
assert.equal(approved.productEngineBridge?.designVersionId,"design-version-42");
assert.equal(approved.productEngineBridge?.validationState,"production-approved");

assert.throws(()=>buildDiaryProductionPackage(result,{
  humanApproved:true,
  culturalReview:"approved",
  originalityReview:"approved",
  physicalValidation:"approved"
}),/designVersionId/);
