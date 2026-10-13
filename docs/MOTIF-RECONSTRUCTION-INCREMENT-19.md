# Increment 19: shirt placket structure and expanded relation fit

Used the retained CC0 Cleveland print image of Peasant Blouse, accession
1924.629, with museum attribution Norway, Hardanger, 19th century. Documentary
regional evidence is included in provenance. It is not relabelled Ukrainian.

The source was cropped at full resolution for collar/placket and cuff review.
Three independently positioned left-placket diamond envelopes and six inner
red lobed envelopes were manually annotated, giving nine draft elements and
six nesting relations. Their polygons are approximate envelopes, not exact
stitch contours. The outer diamonds retain unequal photographed shapes; inner
lobes are coarse regularised approximations. No symbolism or botanical identity
is assigned.

Existing observed-field and observed-contour components build three regions:
collar window, left-placket window and cuff window. Collar and cuff internal
motifs are explicitly untraced; their source crops are supplied for subsequent
annotation. A protected interior strip marks part of the central placket opening.
That strip does not represent the entire opening boundary.

`npm run benchmark:motif:norwegian-placket` verifies the source permission/hash,
image dimensions, geometry containment, nesting, clearance and protected space.
It generates graph, source overlays, full-resolution detail crops and reference
contour SVG. Retained results are under
`data/research/motif-benchmarks/norwegian-placket-v1/`. The existing historical
benchmark chain and its GitHub workflow now run this fixture.

The fixture tests preserve every supplied image-space contour vertex, retain
the museum region evidence and distinguish nesting from junctions. Existing
exact-repeat inference produces **zero** repeat relations for the independently
drawn, deformed units; visual repetition alone is not evidence of an exact
translation lattice.

## Actual statistical fit

Added the new permitted annotated source to relationship manifest v3 and ran
the existing logistic relationship fitter under Node 22. All previous sources
remain. There are five source objects, four source groups, 54 annotated
elements and 722 correlated directed pairs: 664 none, 32 junction, 26 nest.
The two Ukrainian plates remain grouped by book.

Weighted loss decreased from 1.098612 to 0.028228. Leave-one-source-group-out
macro F1 is 0.987152 and accuracy 0.997230, **identical to the deterministic
geometry baseline**. This changed evaluation set cannot establish improvement
over the earlier run. Input contours and ports remain manually supplied, not
predicted by a neural image model. `none` still means no declared relation in
the partial draft, not expert-verified absence of all connections.

Candidate model/report are retained in `data/research/training/runs/relations-v3/`.
`npm run train:motif:relations` now defaults to manifest v3, so the existing CI
training stage includes it. The model remains unpromoted. No live Neon write,
foundation-model fine-tune, canonical geometry change, stitch count, fabric-grid
calibration, machine file or production approval occurred.

Verified locally: engine typecheck/build, 49 test files with 180 passing tests,
production pilot, nine training tests, actual-source benchmark and real fit.
Source overlay was visually inspected. Remote CI success is not established by
these local results.

Next: annotate collar and cuff interiors at source resolution; then add bird
silhouettes with woven-ground separation as a distinct source family. These
need separate geometry/evidence review before entering relation training.
