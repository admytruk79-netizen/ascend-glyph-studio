import {strict as assert} from "node:assert";
import {CanonicalArtwork,hashCanonicalArtwork,projectCanonicalArtwork,validateCanonicalArtwork} from "./canonical-artwork";
import {preflightProduction} from "./universal-preflight";
import {diaryGeometryAdapter} from "./diary-geometry-adapter";

const raw={id:"ascend-canonical-test",revision:"1",viewBox:{x:0,y:0,width:1000,height:1000},polygons:[[{x:100,y:100},{x:900,y:100},{x:500,y:900}]],minLineUnits:20,minGapUnits:25};
const art:CanonicalArtwork={...raw,sourceHash:hashCanonicalArtwork(raw)};
assert.deepEqual(validateCanonicalArtwork(art),[]);
const projected=projectCanonicalArtwork(art,{zoneId:"cover",xMm:24,yMm:24,widthMm:100,heightMm:100,registrationDemandMm:1});
assert.equal(projected.canonicalSourceHash,art.sourceHash);
assert.equal(projected.placement.minLineMm,2);
assert.equal(projected.placement.minGapMm,2.5);
assert.equal(projected.placement.bounds[0]?.x,34);
assert.equal(projected.placement.bounds[0]?.y,34);

const profile={id:"reference-print",revision:"1",process:"print" as const,sourceId:"test-reference",constraints:{minLineMm:1,minGapMm:1,registrationToleranceMm:.5}};
const result=preflightProduction(diaryGeometryAdapter.geometry(),profile,[projected.placement]);
assert.equal(result.valid,true);

const tooSmall=projectCanonicalArtwork(art,{zoneId:"cover",xMm:24,yMm:24,widthMm:20,heightMm:20});
const failed=preflightProduction(diaryGeometryAdapter.geometry(),profile,[tooSmall.placement]);
assert.equal(failed.valid,false);
assert.ok(failed.errors.includes("line-too-thin:ascend-canonical-test"));
assert.ok(failed.errors.includes("gap-too-small:ascend-canonical-test"));

const tampered={...art,revision:"2"};
assert.ok(validateCanonicalArtwork(tampered).includes("canonical-source-hash-mismatch"));
