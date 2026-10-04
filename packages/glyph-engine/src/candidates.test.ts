import{strict as assert}from"node:assert";import{generateCandidates}from"./candidates";
const i={seed:"family",meanings:["lineage"],principleIds:["p1"],density:"balanced" as const,symmetry:"bilateral" as const,product:{kind:"diary",zones:[{id:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"hero"}]}};
const a=generateCandidates(i,8),b=generateCandidates(i,8);assert.deepEqual(a,b);assert.equal(a.length,8);assert.ok(a.every(x=>x.score>=0&&x.score<=1));assert.ok(a.every(x=>x.metrics.traceability===1));for(let n=1;n<a.length;n++)assert.ok(a[n-1].score>=a[n].score);
