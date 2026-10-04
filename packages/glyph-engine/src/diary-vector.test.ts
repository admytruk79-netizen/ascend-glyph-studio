import { strict as assert } from "node:assert";
import { synthesizeDiaryVector } from "./diary-vector";

const input={seed:"ascend-diary-001",meanings:["lineage","freedom"],principles:["axis","guard"],density:"balanced" as const,symmetry:"bilateral" as const};
const a=synthesizeDiaryVector(input),b=synthesizeDiaryVector(input);
assert.equal(a.svg,b.svg,"same manifest must reproduce identical SVG");
assert.equal(a.manifestSha256,b.manifestSha256);
assert.match(a.manifestSha256,/^[a-f0-9]{64}$/);
assert.ok(a.paths.length>=2);
assert.ok(a.svg.includes("<metadata>"));
