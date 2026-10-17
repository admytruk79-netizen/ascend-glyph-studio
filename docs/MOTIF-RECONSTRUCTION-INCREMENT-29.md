# Increment 29 — original compound floral band and layer-aware prototype stitching

Development branch: `codex/motif-graph-reconstruction`. Manufacturing state: REFERENCE.

## Implemented

The studio opens in **Original compound floral** mode. It generates scalloped flower foundations, alternating outer petals, nested inner petals, rose whorls, cores/pollen, terminal buds, separately positioned lower foliage, connected branch networks and two flowering-vine border fields. Seeds vary flower anatomy and whorl rotation; density controls repeat count. These are original procedural shapes and authored layout rules informed by earlier visual study. No source-image paths, new learned grammar or trained image model are used. This does not establish resemblance to any specific historical regional style, corpus-wide novelty or aesthetic approval.

The existing blend `Kit`, Tesseract MotifGraph/containment/machine components and stitch planner remain in use. The shared authored assembly inspector is factored from the learned inspector; the learned wrapper still validates its snapshot and returns its prior model metadata. Canonical geometry remains unchanged. Every flower core is a child assembly with a checked containment relation. Branch, head, petiole, leaf and carrier contacts use on-path ports. A conservative circle-envelope check separates independent leaves from flower heads; it does not certify every pair of shapes.

The stitch planner has an optional object-order path, with legacy colour grouping unchanged by default. A separate independent-layer scheduler groups disconnected shapes by colour while preserving original order wherever stroke-expanded bounding boxes overlap. Its 0.5 mm margin exceeds the current prototype recipe's 0.2 mm pull compensation; this is not a general thread-physics model. Repeated colour passes remain explicit in the plan/preview/time estimate. This avoids sewing inner layers beneath outer fills and reduces this benchmark from roughly 560 passes to 27 without flattening layered geometry. The mode reports colour passes and estimated time; it supports composition/stitch-preview SVG and save/open projects. No machine file is released.

Project input now limits seeds to the supported 0–1,000,000 interval; generation wraps within that interval. Strict indexed-access compatibility fixes in the existing containment checker preserve its guards and behaviour.

## Evidence

Run `npx tsx scripts/benchmark-compound-floral.ts`. Retained SVGs and JSON are in `data/research/motif-benchmarks/compound-floral-v1/`.

At 250 × 80 mm, density 0.8, seeds 0/1/3 produce:

- 15 compound flowers, 15 checked nested cores, 93 junctions, zero broken junctions.
- Conservative independent leaf/flower envelope clearance at least 1.4356 mm.
- 23,652 / 23,299 / 23,698 calculated stitches and 27 colour passes.
- Valid reference job plans with the Brother 356 × 203 mm reference profile.
- All evaluated geometric stitch-gate checks pass; release remains false because the linen recipe has no validated sew-out.

Tests cover exact deterministic regeneration, variation including seed 3, canonical immutability, complete production-object ownership, containment/nesting, clear foliage, counts from real stitch commands, invalid input, several narrow/tall/wide job envelopes and explicit oversized-machine rejection. Stitch regressions cover repeated colour passes, unchanged legacy grouping and preserved overlapping-layer order while independent shapes can group by colour.

Verification: blend suite 9 tests passed; stitch suite 24 passed; Tesseract 54 files / 192 tests passed. Blend, stitch and Tesseract typechecks passed. Web TypeScript/Vite production build passed with the existing large-bundle warning. Playwright against the final built app verified generation, variation, stitch SVG download, exact project roundtrip, oversized-machine rejection, no page errors and no 390 px overflow.

## Incomplete

Human aesthetic review, broader botanical anatomy, animal/geometric original families, inferred historical reconstruction, independently reviewed cultural attribution, physical calibration, machine postprocessing/export and sew-out remain incomplete. Reference-profile checks do not establish manufacturer approval. Small or unusually dense compositions may fail stitch checks; failures remain visible. Benchmark results apply to the documented cases, not every setting. Project files retain parameters, not immutable copies of engine assets.
