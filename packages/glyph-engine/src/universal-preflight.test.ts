import {strict as assert} from "node:assert";
import {preflightProduction} from "./universal-preflight";
import {diaryGeometryAdapter} from "./diary-geometry-adapter";
import {ProductGeometry} from "./product-geometry";

const print={id:"print-ref",revision:"1",process:"print" as const,sourceId:"test-reference",constraints:{minLineMm:.35,minGapMm:.3,registrationToleranceMm:.5,maxAreaMm2:20000}};
const diary=diaryGeometryAdapter.geometry();
const ok=preflightProduction(diary,print,[{id:"cover-mark",zoneId:"cover",bounds:[{x:20,y:20},{x:120,y:20},{x:120,y:80},{x:20,y:80}],minLineMm:.5,minGapMm:.5,registrationDemandMm:1}]);
assert.equal(ok.valid,true);

const bad=preflightProduction(diary,print,[{id:"edge-mark",zoneId:"cover",bounds:[{x:2,y:2},{x:30,y:2},{x:30,y:30},{x:2,y:30}],minLineMm:.2,minGapMm:.1,registrationDemandMm:.2}]);
assert.equal(bad.valid,false);
assert.ok(bad.errors.includes("outside-safe-area:edge-mark"));
assert.ok(bad.errors.includes("line-too-thin:edge-mark"));
assert.ok(bad.errors.includes("gap-too-small:edge-mark"));
assert.ok(bad.errors.includes("registration-too-tight:edge-mark"));

const cylinder:ProductGeometry={productKind:"vessel",sourceId:"reference-cylinder",revision:"1",zones:[{id:"wrap",surface:"cylinder",safeInsetMm:3,outline:[{x:0,y:0},{x:120,y:0},{x:120,y:60},{x:0,y:60}]}]};
const embroidery={id:"emb-ref",revision:"1",process:"embroidery" as const,sourceId:"test-reference",constraints:{minLineMm:.8}};
const unsupported=preflightProduction(cylinder,embroidery,[{id:"wrap-glyph",zoneId:"wrap",bounds:[{x:10,y:10},{x:50,y:10},{x:50,y:40},{x:10,y:40}],minLineMm:1,minGapMm:1}]);
assert.equal(unsupported.valid,false);
assert.ok(unsupported.errors.includes("unsupported-surface-process:wrap-glyph:cylinder:embroidery"));

const noGo:ProductGeometry={productKind:"panel",sourceId:"reference-panel",revision:"1",zones:[{id:"face",surface:"flat",safeInsetMm:2,outline:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],noGoZones:[{id:"hardware",reason:"fastener",clearanceMm:3,outline:[{x:40,y:40},{x:60,y:40},{x:60,y:60},{x:40,y:60}]}]}]};
const collision=preflightProduction(noGo,print,[{id:"emblem",zoneId:"face",bounds:[{x:35,y:35},{x:45,y:35},{x:45,y:45},{x:35,y:45}],minLineMm:.5,minGapMm:.5}]);
assert.equal(collision.valid,false);
assert.ok(collision.errors.includes("no-go-intersection:emblem:hardware"));
