import{strict as assert}from"node:assert";import{generateTesseractArtifact}from"./general-tesseract";import{generateSleevePair}from"./sleeve-projection";import{toPersistenceBundle}from"./tesseract-persistence";
const a=generateTesseractArtifact("persist-v1","garment",24),p=generateSleevePair("persist-v1","split-macro"),b=toPersistenceBundle(a,[p.left,p.right]);
assert.equal(b.graph.seed,"persist-v1");assert.equal(b.artifact.substrateKind,"garment");assert.equal(b.sleeves?.length,2);assert.ok(b.artifact.svgText.startsWith("<svg"));assert.equal(b.graph.semanticChecksum.length,8);
