import { strict as assert } from "node:assert";
import { runDiaryEngine } from "./diary-engine";
const x={seed:"ascend-001",meanings:["lineage","journey"],principles:["axis","rhythm"],density:"balanced" as const,symmetry:"bilateral" as const};
const a=runDiaryEngine(x),b=runDiaryEngine(x);
assert.equal(a.id,b.id);
assert.equal(a.validation.valid,true);
assert.deepEqual(a.exports.map(x=>x.zone),["cover","spine","border","divider","emblem"]);
assert.equal(a.exports.length,5);
const expected:Record<string,[number,number]>={cover:[148,210],spine:[18,210],border:[148,210],divider:[148,210],emblem:[36,36]};
for(const e of a.exports){
 assert.match(e.svg,/^<svg/);
 assert.ok(e.svg.includes(a.manifestSha256));
 const [w,h]=expected[e.zone];
 assert.ok(e.svg.includes(`width="${w}mm"`));
 assert.ok(e.svg.includes(`height="${h}mm"`));
 assert.ok(e.svg.includes(`viewBox="0 0 ${w} ${h}"`));
 assert.ok(e.svg.includes('"safeInsetMm":'));
 assert.ok(e.svg.includes('transform="translate('));
}
