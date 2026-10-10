# Tesseract reconstruction accuracy roadmap

Status: normative implementation order. Do not skip a stage because a later generator can mask errors.

1. Benchmark corpus — representative simple/elaborate, periodic/non-periodic, floral/geometric/interlace, multiple media, clean/distorted/damaged; grouped train/validation/holdout; hand-reviewed ground truth for components, axes, repeat vectors and relations.
2. Image normalization — preserve immutable source; EXIF rotation; textile ROI; perspective/affine correction only with measured support; retain inverse transform and uncertainty.
3. Component reconstruction — instance segmentation/proposals; geometry and confidence per motif; repeated-instance correspondence; human review below confidence threshold.
4. Symmetry/lattice verification — estimate transformations from pixels/features, then verify by registration residual; classify only after evidence; store alternatives when ambiguous.
5. Object-specific graph — nodes are observed motif instances/construction guides; edges are measured relations; never synthesize fixed nodes to describe evidence.
6. Construction-family learning — cluster graph embeddings/topology after object reconstruction; learn distributions, not a global average.
7. ASCEND composition — immutable canonical glyph geometry; graph grammar controls placement/scale/orientation/relationships.
8. Visual refinement — generative model is conditioned by verified structure; it may enrich surface detail but may not rewrite canonical identity.
9. Production validation — compile to embroidery/weave/print constraints and verify physical limits before production-ready status.

## Gates
Every stage emits version, provenance, confidence and uncertainty. No downstream promotion when a required upstream confidence gate fails. Holdout data is never used to tune thresholds. Every algorithm change must beat the current baseline on the benchmark or document a deliberate tradeoff.

## Core metrics
Component IoU/boundary error; landmark/axis error; repeat-vector endpoint error; registration residual; symmetry classification accuracy/calibration; graph node/edge F1 plus geometric relation error; source render-back error; canonical-glyph geometry delta (=0); crop/global retrieval similarity for originality; manufacturing constraint violations.

## Current technical debt
The existing reconstruction-inference.ts is a coarse corpus-level heuristic. It must not be treated as authoritative object reconstruction. Its fixed framework/field/compound/detail nodes and uncalibrated thresholds are provisional only.
