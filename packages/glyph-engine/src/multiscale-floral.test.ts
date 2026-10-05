import{strict as assert}from"node:assert";import{buildMeaningGraph}from"./tesseract-meta-grammar";import{buildMultiscaleField,renderMultiscaleSvg}from"./multiscale-floral";
const g=buildMeaningGraph("oleksandr-microflora-v1"),a=buildMultiscaleField(g,32),b=buildMultiscaleField(g,32);
assert.deepEqual(a,b);assert.equal(a.microCount,320);assert.equal(a.meso.length,10);assert.ok(new Set(a.meso.map(x=>x.kind)).size>=3);
const svg=renderMultiscaleSvg(a);assert.ok(svg.startsWith("<svg"));assert.ok(svg.includes("tiny-rosette")===false);assert.ok(svg.length>10000);
