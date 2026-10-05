import { strict as assert } from "node:assert";
import { exportDiaryFamily } from "./diary-family-export";

const input={
 seed:"ascend-first-family-001",
 meanings:["lineage","journey","guardian"],
 principles:["axis","rhythm","enclosure"],
 density:"balanced" as const,
 symmetry:"bilateral" as const
};
const a=exportDiaryFamily(input),b=exportDiaryFamily(input);
assert.deepEqual(a,b,"family export must be deterministic");
assert.equal(a.validation.valid,true);
assert.equal(a.validation.surfaceCount,5);
assert.equal(a.validation.uniqueSurfaceNames,true);
assert.equal(a.validation.safeGeometry,true);
assert.deepEqual(a.surfaces.map(x=>x.zone),["cover","spine","border","divider","emblem"]);
for(const surface of a.surfaces){
 assert.match(surface.filename,/^[a-z]+-[a-f0-9]{12}\.svg$/);
 assert.ok(surface.svg.startsWith("<svg"));
 assert.ok(surface.svg.includes("<metadata>"));
 assert.ok(surface.svg.includes(a.manifestSha256));
}
