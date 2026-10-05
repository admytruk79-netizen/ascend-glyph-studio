import {strict as assert} from "node:assert";
import {validateProductGeometry} from "./product-geometry";
import {diaryGeometryAdapter} from "./diary-geometry-adapter";
import {validateProcessProfile} from "./manufacturing-process";

const diary=diaryGeometryAdapter.geometry();
assert.deepEqual(validateProductGeometry(diary),[]);
assert.equal(diary.productKind,"bound-object");
assert.equal(diary.zones.find(z=>z.id==="spine")?.surface,"folded");
assert.equal(diary.zones.find(z=>z.id==="cover")?.surface,"flat");

assert.deepEqual(validateProductGeometry({productKind:"object",sourceId:"source",revision:"1",zones:[{id:"wrap",surface:"cylinder",safeInsetMm:2,outline:[{x:0,y:0},{x:100,y:0},{x:100,y:40},{x:0,y:40}]}]}),[]);
assert.deepEqual(validateProcessProfile({id:"ref-print",revision:"1",process:"print",sourceId:"reference-only",constraints:{minLineMm:.3,minGapMm:.3}}),[]);
assert.ok(validateProcessProfile({id:"",revision:"",process:"embroidery",constraints:{minLineMm:-1}}).length>=3);
