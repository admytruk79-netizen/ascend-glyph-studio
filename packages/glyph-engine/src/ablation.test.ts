import{strict as assert}from"node:assert";import{ablatePrinciples}from"./ablation";
const i={seed:"ablation",meanings:["lineage","journey"],principleIds:["p1","p2","p3"],density:"balanced" as const,symmetry:"bilateral" as const,product:{kind:"diary",zones:[{id:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"hero"}]}};
const r=ablatePrinciples(i);assert.equal(r.length,3);assert.ok(r.every(x=>typeof x.geometryChanged==="boolean"));assert.ok(r.every(x=>Number.isFinite(x.scoreDelta)));
