import { strict as assert } from "node:assert";
import { buildPatternTrainingCorpus,summarizePatternCorpus,buildComplexPatternCorpus,uniqueComplexPatterns } from "./pattern-training";
const base={seed:"ascend-lineage-training-v2",meanings:["lineage","protection","ascent","journey"],principles:["asc-lineage-axis","asc-journey-band","asc-placement-cosmology"],density:"balanced" as const,symmetry:"bilateral" as const};
const a=buildPatternTrainingCorpus(base,8),b=buildPatternTrainingCorpus(base,8);assert.deepEqual(a,b);
const s=summarizePatternCorpus(a);assert.equal(s.count,96);assert.equal(s.archetypes.length,12);assert.equal(s.legacyAtlasRequired,false);assert.ok(s.sourceGlyphs.length>20);assert.ok(s.sourceGlyphs.every(x=>x.startsWith("asc-new-")));assert.ok(a.every(x=>x.source.glyphs.length===4&&x.source.provenance.copiedHistoricalMotif===false&&x.objectives.traceability===1));
const deep=buildComplexPatternCorpus(base,{variantsPerArchetype:64,generations:8});assert.equal(deep.length,6144);assert.ok(uniqueComplexPatterns(deep).length>1000);assert.ok(deep.every(x=>x.source.provenance.legacyAtlasRequired===false));
