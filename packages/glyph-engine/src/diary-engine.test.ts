import { strict as assert } from "node:assert";
import { runDiaryEngine } from "./diary-engine";
const x={seed:"ascend-001",meanings:["lineage","journey"],principles:["axis","rhythm"],density:"balanced" as const,symmetry:"bilateral" as const};
const a=runDiaryEngine(x),b=runDiaryEngine(x);
assert.equal(a.id,b.id);
assert.equal(a.validation.valid,true);
assert.deepEqual(a.exports.map(x=>x.zone),["cover","spine","border","divider","emblem"]);
assert.equal(a.exports.length,5);
for(const e of a.exports){assert.match(e.svg,/^<svg/);assert.ok(e.svg.includes(a.manifestSha256));}
