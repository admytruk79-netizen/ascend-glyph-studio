# Increment 30 — richer geometry and reproducible source-density calibration

Development branch: `codex/motif-graph-reconstruction`. Manufacturing state: REFERENCE.

## What changed

The original compound-floral generator now has larger primary and secondary heads, more space per repeat, two connected secondary scrolls per unit, and articulated lobed foliage. Source paths are not copied. Flower sizes and repeat aspect are configurable within explicit bounds. The leaf/flower check now uses a conservative leaf-segment capsule rather than a large enclosing circle: the authored leaf is straight-axis and every point fits within the recorded half width. Connections, nested-core containment, canonical invariants and existing machine/stitch gates remain in use.

`npx tsx scripts/fit-floral-density.ts` performs an actual finite-grid numerical fit. It reads the retained images of Samokysh plates 27 and 37, checks their original hashes and retained analysis permissions, and reuses existing palette k-means, foreground segmentation and raster measurements. Five parameter candidates are evaluated at seeds 0/1/3. The objective is absolute error from the two images' mean foreground density, considering candidates that pass the evaluated geometric stitch checks. The selected parameters are written to `packages/blend-engine/src/floral-calibration.ts`, imported by the live generator. This is data-based calibration of three scalar settings, **not neural training, botanical learning or training an artistic-quality model**. The added geometry and candidate parameter ranges are authored.

## Measurements

Retained `data/research/motif-benchmarks/compound-floral-v2/density-fit.json` includes sources, hashes, permissions, measurements, candidates, failed geometric checks, raster flags and selection. Repeated execution initially reproduced the report byte for byte; the final schema additionally exposes complete baseline metrics and raster flags. Source foreground coverage: 55.93% and 51.42%, target mean 53.67%. Earlier seed-0 output: 27.32%. Selected candidate across three seeds: 32.40% mean. Baseline raster clutter is 0.243; selected candidates measure approximately 0.222–0.225, still above the existing 0.2 threshold. All selected samples retain `raster-tangle`. No overall visual-quality pass is claimed.

`npx tsx scripts/benchmark-compound-floral-v2.ts` retains the updated SVGs and manufacturing diagnostics. At 250 × 80 mm / density 0.8, seeds 0/1/3 have 12 compound flowers, 12 checked nested cores, 82 intact declared junctions and no independent leaf/flower capsule overlaps. Minimum recorded capsule clearance is about 1.79 mm. Counts are 27,084 / 27,643 / 27,678 calculated stitches and 30 colour passes. Evaluated geometric stitch gates pass for these cases; recipe sew-out validation still blocks release. These are prototype counts, not machine files or validated sew-outs.

## Verification

- Blend engine suite: 9 tests passed; typecheck passed.
- The two compound-floral tests were rerun after adding assertions that the fitted defaults are used and changing calibration changes output; both passed.
- Web TypeScript/Vite production build passed, with the existing large-bundle warning.
- Playwright against the final production build verified generation, seed variation, stitch-preview SVG download, exact project reopening, machine oversize rejection, no page errors and no overflow at 390 px.
- Earlier v1 benchmark files remain unchanged; updated artifacts use v2.

## What this does not establish

There are two references by one artist and no held-out-source evaluation. Full-plate foreground masks include scan texture, lettering and non-floral fields; density is not true thread coverage or an aesthetic label. Source regional identity, botanical species, historical construction grammar and community-specific meanings are not inferred. This fit is not a validated classifier/ranker and does not establish visual quality, corpus-wide originality, machine readiness or physical approval. The remaining structural limitation is the repeated upright branch layout: it needs more distinct compositions and expertly reviewed examples, not merely larger flowers. ChatGPT itself has not been retrained.
