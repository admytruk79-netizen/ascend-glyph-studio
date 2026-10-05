import { strict as assert } from "node:assert";
import { runDiaryEngine } from "./diary-engine";
import { buildDiaryPersistenceRecord } from "./diary-persistence";

const result=runDiaryEngine({
 seed:"ascend-first-family-001",
 meanings:["lineage","journey","guardian"],
 principles:["axis","rhythm","enclosure"],
 density:"balanced",
 symmetry:"bilateral"
});
const pending=buildDiaryPersistenceRecord({
 result,
 synthesisCandidateId:"11111111-1111-4111-8111-111111111111",
 designId:"22222222-2222-4222-8222-222222222222",
 designVersion:1,
 approval:{humanApproved:false,culturalReview:"pending",originalityReview:"pending",physicalValidation:"pending"}
});
assert.equal(pending.production.productEngineBridge,null);
assert.equal(pending.manifest.artwork.length,5);
assert.equal(pending.manifestSha256,result.manifestSha256);
assert.equal(pending.reviewGate.designVersionId,"22222222-2222-4222-8222-222222222222:1");

const approved=buildDiaryPersistenceRecord({
 result,
 synthesisCandidateId:"11111111-1111-4111-8111-111111111111",
 designId:"22222222-2222-4222-8222-222222222222",
 designVersion:1,
 approval:{humanApproved:true,culturalReview:"not-required",originalityReview:"approved",physicalValidation:"approved"}
});
assert.equal(approved.production.productEngineBridge?.validationState,"production-approved");
assert.equal(approved.production.productEngineBridge?.artwork.length,5);
