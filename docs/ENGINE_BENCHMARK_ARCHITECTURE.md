# Glyph Engine benchmark architecture

## Public systems reviewed
- flowshape: deterministic pure-SVG generators; normalized frame; URL/state reproducibility; per-generator parameter contracts; snapshot tests.
- ShapeSoup: core engine separated from web playground; config + seed determinism; SVG export; shareable state.
- procedural-pattern-generator: parametric primitives; periodic/seamless tiling; SHA-256 determinism; parameter sensitivity and seam tests; product mockups downstream.
- Vecturnal: grid cloning; custom SVG paths; modifier pipeline; reseeding; clean SVG export.
- ornament.name creator: element editing, cell shape/fill/density, canvas, persistence and SVG output.
- Vytvory: verified ornament library feeding a customer composition/customization layer; product configuration downstream.

## ASCEND architecture adopted
1. Research ingestion: source/artifact/form/evidence/relation with provenance and cultural access.
2. Analyzer: geometry -> primitives -> topology -> symmetry -> rhythm/repetition -> hierarchy/density/negative space -> normalized feature vector.
3. Corpus statistics: recurrence, source/region/period diversity, contradictions and confidence.
4. Evidence graph: principles and relations remain traceable to source records.
5. Universal grammar: product-independent rules/relations.
6. Deterministic synthesis: seed + semantic intent + audited grammar -> normalized universal SVG candidate.
7. Evaluation: composition, ablation/counterfactual, originality and cultural gates.
8. Immutable recipe: seed, parameters, grammar version, evidence IDs, hashes.
9. Product adapter boundary: only after universal approval; diary is first adapter, not engine architecture.
10. Interactive studio: reproducible state, parameter locks, controlled mutation, live SVG, provenance/analytics sidecar.

## Coding rules
- Pure deterministic functions in the core; no Date/Math.random/network/database inside synthesis.
- Separate packages/modules for ingestion, analysis, grammar, synthesis, evaluation, renderer and adapters.
- Normalized universal coordinate system before product projection.
- Runtime schema validation at IO boundaries and strict TypeScript internally.
- Property/invariant tests: same seed=same SVG; parameter sensitivity; no unsupported grammar rule; provenance completeness; cultural blocked means no synthesis; normalized bounds; SVG validity.
- Golden/snapshot tests for canonical seeds plus metamorphic tests for symmetry/repeat/scale invariants.
- Version every grammar, recipe and analyzer. Approved revisions are immutable.
- No source motif is emitted directly by the synthesis renderer.
