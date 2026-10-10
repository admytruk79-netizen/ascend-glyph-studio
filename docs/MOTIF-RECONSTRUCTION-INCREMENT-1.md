# Motif reconstruction increment 1

This implements the first scaffold requested by `TESSERACT-MOTIF-RECONSTRUCTION-CODEX-BRIEF.md` and `PRODUCTION-ENGINE-POA.md`. Every output remains **REFERENCE**. No model training, historical-image analysis, machine approval, or physical validation has occurred.

## Implemented

- Versioned typed `MotifGraph`: composition / region / assembly / element hierarchy, observed reference polylines and named ports, junction / repeat / nest relations, protected negative space, confidence, evidence and millimetre units.
- Provenance requires source, creator/community (explicit null allowed), cultural context, retrieval timestamp, original SHA-256, permission evidence, permitted purposes, cultural access and transformation history. Unknown/restricted permission and uncertain/community-specific/sacred-restricted access fail closed in this initial baseline. This guard is metadata validation, not independent verification of licence claims.
- Deterministic decomposition of **explicit vector annotations** into a copied, validated graph. This is an annotation baseline, not image segmentation or learned inference.
- Reconstruction applies nested translation, rotation, positive anisotropic scale and reflection to observed geometry. Canonical source geometry is never used as mutable reference geometry.
- Structural measurements detect declared junction separation, repeat displacement, nesting and segment crossings through protected rectangles. An independently authored world-space fixture checks vector-point RMSE; a deliberately damaged graph verifies fault sensitivity.
- An explicit ASCEND mapping bridge uses existing `productionObjectsFromTopology`, `placeProductionObjects`, `compileProductionObjectsToStitchIr`, canonical preview and manufacturing job plan components. Canonical mappings reject unsupported reflection / anisotropic scaling and out-of-envelope scale. Mapped jobs are always invalid with `motif-canonical-layout-unvalidated`: reference ports/clearances cannot certify different canonical geometry. This API emits an experimental object/IR result, not an approved manufacturing file.

## Reproduce

```sh
npm run typecheck --workspace=@ascend/tesseract-engine
npm test --workspace=@ascend/tesseract-engine
npm run benchmark:motif
```

The benchmark writes graph JSON, reference SVG, nine canonical piece-envelope SVG smoke checks and a report under `artifacts/motif-reconstruction/`. The committed initial report is `docs/benchmarks/motif-reconstruction-v1.json`. Vector RMSE is **not** a raster similarity or cultural/style score. Synthetic fixture permission is limited to repository development/test use; no historical source permission is inferred.

Local verification: 82 Tesseract tests across 30 files passed; typecheck and build passed. The benchmark script also passed standalone TypeScript checking; 22 stitch-engine tests passed. Benchmark: zero vector-point RMSE; deterministic hashes; three intact junctions, one intact repeat and one declared nesting relation; no protected-space violations. Negative control: one broken junction, one broken repeat, one protected-space violation. Pilot M nine-piece compilation uses existing **reference** shirt measurements; it does not validate zones, construction no-go areas, seam registration or full-shirt design quality. All nine mapped jobs remain invalid as intended.

## Still incomplete

- Authorised historical image collection, original-asset retention, rectification, raster segmentation, lattice/symmetry inference and motif extraction.
- Historical/community-reviewed fixtures, source/artist-disjoint splits, tracing / primitive tiling / SVG-first baselines and raster similarity. Unmeasured metrics are null in the report.
- General minimum-gap/collision scoring, symmetry scoring, feature-level evidence mapping and topology inference. `minGapMm` is retained and validated numerically but not yet enforced by the reference scorer.
- ASCEND mapping connector correspondence, canonical relation reconstruction, collision/clearance validation, reflection and anisotropic manufacturing support. Current mapping is explicit and separate from reference reconstruction; it does not reconstruct canonical junctions.
- Shirt zone projection, seam-continuity and registered multi-hoop segmentation benchmarks. The nine-piece check is only an envelope/compilation smoke test.
- Machine-profile validation, actual stitch generation/count, postprocessing, material calibration, sew-out and production approval. The existing live pattern generator is unchanged; the experimental API is not wired into it.
- Neon-backed 3.7 visual regression gate and physical release gates. This offline benchmark measures a different contract and cannot substitute for them.

Next increment: annotated permission-verified historical fixture with explicit component/port correspondence, then canonical connection and clearance validation before accepting any mapped job.
