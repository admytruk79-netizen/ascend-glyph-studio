# Increment 18: Palestinian garment fields and nested geometry

The CC0 Cleveland Museum of Art blouse front, accession 1937.582, now has a
manual draft decomposition: six separated field windows, a protected interior
subset of the neck opening, and three approximate nested lower diamond
envelopes. Catalogue attribution remains Palestine, 19th century; no city,
maker, symbolism or cultural equivalence to Ukrainian motifs is inferred.

`graphFromObservedFields` reuses the existing observed-annotation builder and
MotifGraph. Explicit field assignments place assemblies under separate region
nodes. It rejects overlapping windows, occupied protected spaces, duplicate or
missing assignments, geometry outside its field and cross-field parent/child
nesting. Empty regions remain untraced and contain no invented geometry.
Canonical ASCEND glyphs and manufacturing gates are unchanged.

The source overlay was visually reviewed against the museum image. Lower
diamond polygons describe coarse envelopes, not individual embroidery outlines
or stitches. The central placket, upper bands and transition windows are
identified but their motifs are not reconstructed. Neck protection covers only
a visible interior rectangle; the irregular complete neckline remains untraced.
These are manual draft annotations, not expert ground truth or learned image
segmentation.

Run `npm run benchmark:motif:palestinian-fields`. The historical benchmark chain
and its existing GitHub workflow also execute it. Image hash, permission and
dimensions are checked before reconstruction. It emits graph, source overlay,
reference contour SVG and report. Retained copies are in
`data/research/motif-benchmarks/palestinian-fields-v1/`.

Verified locally: engine typecheck/build, 48 test files with 178 passing tests,
production pilot and actual-source benchmark under Node 22. The benchmark
reports six fields, three contours, two nesting relations, zero protected-space
violations and zero contour clearance violations. These digital results do not
calibrate fabric dimensions or establish physical production feasibility.

No model was retrained, no Neon record changed, no stitch count or machine file
was generated, and no production approval is claimed. Next: annotate repeat
cells within the bands and decompose the lower angular envelopes into their
observed internal structure; separately segment birds from the woven ground in
the Chinese museum reference. Only validated annotations should enter the next
relationship-training fit.
