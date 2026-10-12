# Bounded training run and wider sequence — 2026-10-12

Actual local statistical fitting was executed under Node 22. This is not a
foundation-model fine-tune, historical taxonomy, production promotion or a
completed image-to-stitch generator. No Neon records or canonical ASCEND
geometry were changed.

## Implemented and executed

- `npm run train:motif:relations`: class-balanced multinomial logistic regression
  over supplied contour/port geometry, predicting none, junction and nest.
  Four approved source objects, three source groups, 45 annotated elements and
  650 correlated directed pairs. Ukrainian plates from the same 1902 book are
  held out together. Normalisation is fitted using training folds only.
- Initial fitting exposed absent independent junction examples: held-out
  junction recall was zero. That failed candidate is retained. A separately
  reviewed CC0 blackwork leaf/stem attachment was then annotated, keeping the
  previous annotation intact. The second fit reduced weighted loss from
  1.098612 to 0.028073. Held-out macro F1 is 0.983569, accuracy 0.996923,
  **identical to the deterministic geometry baseline**. No improvement claimed.
- `npm run train:patterns:sequence`: cumulative five-stage k-means codebook,
  reusing existing Tesseract raster features: Ottoman lampas, blackwork,
  Ukrainian plate 37, Ukrainian plate 27, Dürer radial knotwork. Five images,
  four source groups, 47 shape descriptors. Every stage refits all admitted
  preceding descriptors. This is sequential source coverage, not a trained
  semantic classifier. Source-group holdout distances are below a single-mean
  baseline in four folds; distance is not aesthetic quality.
- Whole-image knotwork extraction yielded no eligible components because of
  the existing component-area limits. Explicit 4×4 tile fragments supplied 20
  descriptors; these do not reconstruct complete knots or crossing order.
- Strict permission manifest, image hashes, annotation source/dimension checks
  and explicit training split/access gates. Old Neon trainer now fails closed
  without an approved manifest and cannot automatically promote by source count.
  Fixed its `.mts` import through a CJS re-export by importing the existing
  raster-feature implementation directly. The full Neon trainer was not run.

Candidate weights and complete reports, including the unsuccessful initial
fit, are retained in `data/research/training/runs/`. Source permissions have a
bounded local experiment scope. Commons references use the retained per-item
public-domain assessment with US scope; no fresh worldwide licence verification
is claimed. Protected Krovets/Honchar sources are excluded.

## Across-the-board next stages

| Sequence | Capability | Evidence and remaining work |
| --- | --- | --- |
| 1 | Geometric, radial and border shapes | Shape fit executed; annotate repeat cells, axes and macro fields before semantic training. |
| 2 | Floral, leaf and branching assemblies | Relationship fit executed on partial drafts; add trees and independent expert annotations. |
| 3 | Interlace and knotwork | Fragment shape fit executed; annotate strands, crossings, continuity and crossing order. Dürer is not evidence of Arabic cultural attribution. |
| 4 | Birds, animals and human figures | Not trained. Acquire approved examples, contours, articulation/attachment labels and source-group holdouts. |
| 5 | Whitework, cutwork and counted grids | Not trained. Separate fabric ground, holes, bridges and stitch grid; retain calibrated warp/weft evidence. |
| 6 | Arabic ornament, Penrose and lettering | Not trained. Separate licensed cultural references from mathematical controls; preserve script direction and immutable canonical glyphs. |
| 7 | Garment placement and repeats | Existing deterministic region/composition helpers remain in use; no learned garment-placement model. |
| 8 | Manufacturing | Existing machine/clearance gates remain in force. Thread width, routing, stitch counts, machine-specific exports and physical sew-outs are not established by these fits. |

Use this order for expansion, with all preceding admitted families replayed at
each fit. Split by source/book/artist before generating tiles or augmentations.
Do not count tile fragments or directed pairs as independent historical sources.
Promote only after independent annotations, a useful baseline comparison,
cultural review and relevant manufacturing evidence.

## Verification

`npm run verify:tesseract-worker`: engine typecheck/build, 46 test files with
172 passing tests, production pilot, stitch-engine typecheck and 22 passing
tests. `npm run test:training`: 9 passing tests. Corpus suite: 43 passing tests.
`npm run benchmark:motif:historical`: completed successfully. Both relationship
fits and the shape sequence ran under Node 22. Repeated shape runs produced
identical console results. Old trainer startup reaches the required-manifest
gate before any database or model write. Remote workflow success is not
established by these local results.
