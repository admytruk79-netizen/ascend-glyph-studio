import { strict as assert } from "node:assert";import { compose } from "./grammar";
const i={seed:"ascend-core-001",meanings:["lineage","journey"],principleIds:["p1","p2"],density:"balanced" as const,symmetry:"bilateral" as const,product:{kind:"diary",zones:[{id:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"hero"}]}};
const a=compose(i),b=compose(i);assert.deepEqual(a,b);assert.equal(a.validation.length,0);assert.ok(a.rules.some(x=>x.id==="axis"));assert.ok(a.sequence.length>=a.rules.length);
