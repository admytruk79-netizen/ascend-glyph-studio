# Increment 24 — original procedural ornament assembly

Development branch: `codex/motif-graph-reconstruction`. State: REFERENCE.

## Implemented

`original-ornament-composition.ts` generates new vector parts rather than embedding photographs. Floral units have seeded lobed heads, nested cores, petal marks, leaf veins, stems and explicit branch junctions. Geometric units have nested diamonds and sharp eight-point centres. Independent main cells, four border fields and a separately constructed connecting vine form the composition.

Reuses existing typed MotifGraph/provenance, annotated decomposition, exact containment, field composition, reconstruction, junction/repeat measurement and clearance components. Canonical ASCEND geometry is unchanged and remains accessible in its separate study view. These ornaments are reference-namespace authored geometry, not canonical glyphs or historically authenticated reproductions.

The studio defaults to generation, offers floral/geometric families, dimensions, density, explicit seed advancement and SVG export. Draft control changes require the generation button; the preview and download describe the actual generated input. Source photographs remain separate references.

`npm run benchmark:motif:original` saves deterministic SVGs, complete graphs and a report in `data/research/motif-benchmarks/original-composition-v1/`. It is deliberately separate from the historical reconstruction benchmark: newly authored compositions are not evidence of historical reconstruction accuracy.

## Evidence

- Engine typecheck/build and web TypeScript/Vite build passed. Vite reports a large bundle warning (1.316 MB before gzip); code splitting remains pending.
- Existing pilot completed with 12 candidates and no execution errors; its manifest still blocks production for missing machine selection and unvalidated reference patterns. It does not test manufacturing of the new ornaments.
- Engine suite: 52 files, 186 tests passed, including 18 machine-feasibility regression tests.
- Three generated cases: floral seed 0 has 271 element parts, 36 junctions and 174 nests; floral seed 1 has 274 parts, 36 junctions and 177 nests; geometric seed 0 has 198 parts and 132 nests. All have zero broken junctions/repeats, zero reported centreline clearance violations and zero outside-envelope elements.
- Deterministic seed reproduction, geometry variation and unchanged canonical registry covered by regression tests.
- Browser: default generator, no source images inside SVG, seed variation, family selection, SVG download, no page errors and no overflow at 390px. Screenshots and check results retained beside the benchmark.

## Provenance and limitations

Authored geometry carries its own provenance and a SHA-256 of the exported grammar-source statement. This hash is not a photograph hash or proof of a museum licence. The uploaded examples and Honchar article inform broad construction/placement study only; no museum contours, photograph pixels, unsupported symbolic meanings or regional claims are copied into this generator.

No learned weights are applied or newly trained by this increment. There is no full-corpus novelty proof or expert aesthetic acceptance. This grammar is a first original composition path and still visually simpler than the supplied historic references; animals, trees, richer compound bouquets and Arabic/Penrose systems are not implemented here.

Clearance checks measure reference path centrelines with minimum gap zero. They do not certify stroke/fill clearance, thread density or sew-out feasibility. Dimensions describe the generated vector canvas, not recovered fabric calibration. Stitch count remains null; no stitch-file export, manufacturing scheduling, machine approval or production deployment is performed. Existing machine gates are preserved, but these new ornaments are not yet integrated into production digitization.
