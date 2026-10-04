# ASCEND Glyph Studio

ASCEND Glyph Studio is a research-driven procedural design system that turns evidence-backed cultural, historical and personal design principles into original, reproducible visual language.

**ROOTS → MEANING → GRAMMAR → FORM**

The system studies sources; it does not treat historical motifs as a clip-art library. Research artifacts, generated candidates and production-approved designs remain distinct.

## First production target: Diaries

The first complete application is a coordinated diary system:
- cover composition
- spine
- border/frame
- endpaper/divider
- emblem/mark

## Architecture

Research source → evidence → tradition/context → concept → form analysis → design principle → deterministic synthesis → candidate → provenance/cultural/originality review → production projection → physical validation → approved design/version.

### Source intelligence
The research corpus may include:
- Ukrainian ancestry, embroidery, rushnyk/vyshyvanka structure and documented semantics
- Cossack history and material culture
- American Western/cowboy material culture, leatherwork, tooling, stitching and horsemanship
- nation-specific Indigenous American references only with provenance, context and cultural-risk review
- ASCEND identity and intended concepts such as lineage, freedom, guardian, journey and transformation

Claims must carry evidence and confidence. Inference must not be presented as documented tradition.

### Synthesis
- deterministic seeded generation
- parameterized composition grammar
- reproducible manifests and SHA-256 fingerprints
- vector-first SVG output
- provenance links from generated features to evidence-backed principles
- originality and cultural-risk gates

### Production
Manufacturing validity is separate from artistic approval and from physical production approval. New materials, processes and placement recipes require physical sampling before Production Approved.

## Non-negotiables
1. No 108-card/Key dependency in the redesigned glyph language.
2. No legacy five-atlas system as the root vocabulary.
3. Do not directly copy research artifacts or restricted/sacred motifs.
4. Same approved manifest must recreate the same geometry.
5. Human approval is mandatory.
6. Sensitive/nation-specific influence requires cultural review.
7. Physical validation is required before Production Approved.
8. Product Engine consumes approved design/version outputs; research and synthesis remain owned here.

## Repository structure
- `apps/web` — studio/customer interface
- `packages/design-schema` — design contracts
- `packages/glyph-engine` — deterministic synthesis
- `packages/glyph-registry` — approved generated glyph/design registry
- `packages/garment-spec` — garment specifications
- `packages/material-spec` — material specifications
- `packages/production-validator` — production constraints
- `packages/renderer` — vector/rendering pipeline
- `services/api` — persistence and integration API
- `docs` — architecture, research policy and POA

See `docs/POA.md` for the current diary-first build sequence.
