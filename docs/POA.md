# ASCEND Glyph Engine — Plan of Action

## Mission
Build an independent research-driven glyph synthesis engine for ASCEND. The engine studies ancestry, material culture, ornament structure and semantics, then generates original, traceable design candidates. It does not copy source motifs.

## First production target: Diaries
Diaries are the first proving ground. The engine must generate production-usable systems for:
- hero cover composition
- spine
- border/frame
- endpaper and divider
- small emblem/mark

## Source intelligence
The knowledge layer stores evidence and analysis from:
1. Ukrainian ancestry, embroidery, rushnyk/vyshyvanka structure and semantics.
2. Cossack history, material culture and visual characteristics.
3. American Western/cowboy material culture, leatherwork, tooling, stitching and horsemanship imagery.
4. Nation-specific Indigenous American references only with provenance, context and cultural-risk review.
5. Oleksandr's ASCEND identity, characteristics, biography and intended meanings.

Sources teach construction principles, morphology, rhythm, hierarchy, placement, color and material behavior. Historical or culturally specific motifs are not automatically reusable glyphs.

## Engine pipeline
Research source → evidence → tradition/context → concept/meaning → form analysis → design principle → synthesis run → candidate → provenance → cultural/originality review → production projection → physical validation → approved design/version.

## POA
### P0 — Audit and preserve
- Treat the dedicated ascend-glyph-studio repository and Neon project as source of truth.
- Preserve existing ontology/synthesis/manufacturing schema.
- Do not migrate Glyph Engine work into Product Engine.

### P1 — Research corpus
- Ingest high-quality museum, academic, archive and book-derived records.
- Record region/nation, period, object type, technique, semantics, structure, source and confidence.
- Separate documented interpretation from inference.

### P2 — Semantic + morphology intelligence
- Establish ASCEND concepts such as lineage, freedom, guardian, journey and transformation.
- Extract primitives and relationships: axis, enclosure, branching, rhythm, repetition, reflection, alternation, hierarchy, density, negative space, direction and transition.
- Connect every principle to evidence.

### P3 — Synthesis engine
- Deterministic seeded runs.
- Parameterized composition grammar.
- Store full manifest/recipe for reproducibility.
- Produce multiple candidates without directly copying research artifacts.
- Score provenance completeness, originality and cultural risk.

### P4 — Diary generator
- Add diary as a first-class substrate/product context.
- Generate coordinated cover/spine/border/divider/emblem families.
- Support masculine/feminine and restrained/complex grammar without changing semantic identity.
- Export vector-ready design manifests and SVG.

### P5 — Review + validation
- Human approval remains mandatory.
- Cultural review gate for sensitive/nation-specific source influence.
- Originality review before canonicalization.
- Physical sample validation before Production Approved.

### P6 — Product Engine bridge
- Product Engine receives only approved design/version IDs, artwork references, production constraints and validation state.
- Glyph research and synthesis remain owned by Glyph Engine.

## Immediate build sequence
1. Audit existing Neon ontology and synthesis tables.
2. Add diary product/substrate model only where current schema does not already cover it.
3. Implement the first deterministic diary synthesis manifest.
4. Populate verified research evidence.
5. Generate first candidate family.
6. Review visually and semantically.
7. Export first diary production artwork package.
