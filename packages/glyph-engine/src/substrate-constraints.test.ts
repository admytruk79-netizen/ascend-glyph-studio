import{strict as assert}from"node:assert";import{buildMeaningGraph}from"./tesseract-meta-grammar";import{buildMultiscaleField}from"./multiscale-floral";import{applyGeometryConstraints}from"./substrate-constraints";
const f=buildMultiscaleField(buildMeaningGraph("constraint-v1"),64),r=applyGeometryConstraints(f,{widthMm:300,heightMm:400,minFeatureMm:.8,maxDensity:.6,mode:"embroidery"});
assert.equal(r.requestedMicroCount,640);assert.ok(r.retainedMicroCount<640);assert.ok(r.retainedMicroCount>0);assert.ok(r.field.meso.every(p=>p.marks.every(m=>m.scale>=r.minScale)));
