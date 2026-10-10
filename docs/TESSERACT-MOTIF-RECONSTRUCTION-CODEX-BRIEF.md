# Tesseract — Motif Decomposition, Reconstruction and ASCEND Assembly

Status: DESIGN BRIEF — not implemented or trained. Updated 2026-10-10.

## Objective
Learn construction principles from legally usable ornamental references, reconstruct their structure, and generate novel, elaborate compositions using canonical ASCEND glyph geometry. Do not merely trace SVG outlines or copy historical motifs.

## Three-scale analysis
1. Macro: axes, fields, borders, central emphasis, symmetry, rhythm, negative space.
2. Meso: compound motifs, rosettes, medallions, vines, branches, nested structures, connectors, repeated families.
3. Micro: junctions, stroke articulation, gaps, material texture, stitch direction, thread/stitch constraints.

## Reference handling and provenance
- Record source URL or archive identifier, creator/community where known, license/permission, retrieval date, cultural context, image transformation history, and confidence.
- Reference traditions are distinct: Ukrainian regional embroidery; Arabic geometric/arabesque systems; community-specific Indigenous North American weaving. Do not merge them into an undifferentiated motif alphabet.
- Do not copy protected or culturally restricted designs or claim symbolic meanings without credible evidence. Learn general structural principles where lawful and appropriate.
- Never relabel a reference motif as a canonical ASCEND glyph. Canonical ASCEND geometry is immutable unless the user approves a versioned change.

## Reconstruction pipeline
1. Ingest authorized image and record provenance.
2. Rectify orientation, perspective, scale and image quality; retain original.
3. Segment layout into macro regions, compound motifs and micro features.
4. Estimate repeat lattice, symmetry groups, axes, nesting hierarchy, connectors and terminal rules.
5. Represent motifs as a typed relational graph with constraints, confidence and evidence links.
6. Reconstruct the reference using the inferred grammar; measure image similarity and structural fidelity separately.
7. Assemble new designs from ASCEND glyphs plus compatible, evidence-derived structural grammar; enforce graph junctions and negative-space constraints.
8. Compile geometry into production objects, then regenerate stitch objects after every placement/scale change.
9. Validate machine field, colors, frame/hoop, registration, fabric and digitizing assumptions; never declare production approval without manufacturer confirmation and physical sew-out.

## Representation
Composition -> regions -> motif assemblies -> elements -> production objects -> stitches.
A transform may use translation, rotation, anisotropic scaling and reflection, but must preserve required connectors, minimum gaps, topology and manufacturability.

## Benchmark before model training
- Start with a small permission-verified set of complex references representing different structural families.
- For each, annotate macro layout, motif graph, connector constraints, repeats and provenance.
- Compare reconstructed vs reference at macro/meso/micro levels; track symmetry accuracy, junction continuity, repeat registration, negative-space preservation, and visual fidelity.
- Compare with simple tracing, primitive tiling, and SVG-first baselines. Document failure cases.
- Split evaluation by source/artist to avoid leakage; do not claim thousands of training examples without an actual licensed dataset and training log.
- Require human aesthetic review and cultural/provenance review.

## Implementation tasks for Codex
1. Inspect docs/PRODUCTION-ENGINE-POA.md and packages/tesseract-engine/src/{production-object.ts,production-stitch-ir.ts,pattern-generator.ts,manufacturing-job-plan.ts,machine-template.ts} before changing code.
2. Implement a typed MotifGraph schema, versioned reference/provenance schema and deterministic reconstruction fixtures; add tests.
3. Build a baseline decomposition and graph reconstruction path with measurable benchmark output, not an unverified image-model claim.
4. Connect motif assembly to existing production-object construction, keeping canonical glyphs and cultural guards intact.
5. Implement machine feasibility checks and fail closed on unvalidated segmented registration.
6. Run TypeScript checks, regression suite and sleeve/full-shirt deterministic benchmarks; report exact commands and results.
7. Submit changes on a development branch/PR; do not promote to production or claim physical validation.

## Acceptance criteria
- Reproducible reference-to-graph-to-reconstruction example with provenance.
- Complex, connected, nested motifs without arbitrary collisions or broken seams.
- Deterministic seeds and explicit transform/connector rules.
- Canonical glyph invariants and culture-specific attribution preserved.
- Actual benchmark scores and test logs attached; manufacturing state marked REFERENCE until measured.

## Important clarification
Proposed historical motif-family counts and any large image-corpus counts are planning hypotheses, not verified historical taxonomies or proof of available training data.
