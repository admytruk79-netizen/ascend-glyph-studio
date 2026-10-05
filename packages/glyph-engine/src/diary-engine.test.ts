import { strict as assert } from "node:assert";import { runDiaryEngine } from "./diary-engine";
const x={seed:"ascend-001",meanings:["lineage","journey"],principles:["axis","rhythm"],density:"balanced" as const,symmetry:"bilateral" as const};const a=runDiaryEngine(x),b=runDiaryEngine(x);
assert.equal(a.id,b.id);assert.equal(a.validation.valid,true);assert.deepEqual(a.exports.map(x=>x.zone),["cover","spine","border","divider","emblem"]);assert.equal(a.exports.length,5);
const expected:Record<string,[number,number]>={cover:[148,210],spine:[18,210],border:[148,210],divider:[148,210],emblem:[36,36]};
for(const e of a.exports){assert.match(e.svg,/^<svg/);assert.ok(e.svg.includes(a.manifestSha256));const dims=expected[e.zone];assert.ok(dims,`unknown zone ${e.zone}`);const [w,h]=dims;assert.ok(e.svg.includes(`width="${w}mm"`));assert.ok(e.svg.includes(`height="${h}mm"`));assert.ok(e.svg.includes(`viewBox="0 0 ${w} ${h}"`));assert.ok(e.svg.includes('&quot;safeInsetMm&quot;:'));assert.ok(e.svg.includes(`&quot;manifestSha256&quot;:&quot;${a.manifestSha256}&quot;`));assert.ok(e.svg.includes('transform="translate('));}

assert.equal(a.production.state,"reference");
assert.equal(a.production.productionApproved,false);
assert.deepEqual(new Set(a.production.blockers),new Set(["physical-sample-validation-required","manufacturer-production-specification-required"]));
const selected=runDiaryEngine({...x,zones:["cover","emblem"]});
assert.deepEqual(selected.exports.map(x=>x.zone),["cover","emblem"]);
assert.equal(selected.production.productionApproved,false);
