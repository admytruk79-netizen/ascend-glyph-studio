import{strict as assert}from"node:assert";import{generateNewGlyphVocabulary,renderNewGlyphSvgSet}from"./new-glyph-system";
const a=renderNewGlyphSvgSet("ascend-new-language-v1",108),b=renderNewGlyphSvgSet("ascend-new-language-v1",108);
assert.deepEqual(a,b);assert.equal(a.length,108);assert.ok(a.every(x=>x.svg.startsWith("<svg")&&x.svg.includes("<metadata>")&&x.svg.includes('viewBox="0 0 100 100"')));
const g=generateNewGlyphVocabulary("x",3);assert.ok(g.every(x=>x.provenance.legacyAtlasRequired===false&&x.provenance.copiedHistoricalMotif===false));
