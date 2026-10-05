import{strict as assert}from"node:assert";import{generateForPersistence}from"./generation-pipeline";
const g=generateForPersistence("oleksandr-lineage-v1","garment",32,"split-macro");assert.equal(g.artifact.field.microCount,320);assert.equal(g.persistence.sleeves?.length,2);assert.equal(g.persistence.artifact.status,"candidate");assert.ok(g.persistence.artifact.svgText.startsWith("<svg"));
const d=generateForPersistence("oleksandr-lineage-v1","diary",32);assert.equal(d.persistence.sleeves,undefined);assert.equal(d.persistence.artifact.substrateKind,"diary");
