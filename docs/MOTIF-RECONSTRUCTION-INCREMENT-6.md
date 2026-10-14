# Editable observed contour parts and retained reference

`partitionObservedMotifPaths` adds an explicit vertex-cut decomposition step to the existing MotifGraph pipeline. It partitions single-path observed elements into editable micro parts, preserves transforms and spatial nest targets, and emits exact contact ports at the supplied cuts. Closed contours retain their closing seam. Cut choices and evidence are recorded in provenance. This is annotation-guided decomposition, not automatic petal/stem identification.

The adapter rejects unordered/end-point cuts, occupied generated IDs, multiple-path inputs, and pre-existing ports or constraints requiring an explicit remapping. It preserves the input graph. Existing canonical ASCEND geometry is unchanged. The resulting reference run IR is not a digitized machine stitch file.

The public-domain Met 445264 source photograph, retained museum API metadata and provenance are now committed under `data/research/motif-references/met-445264/`. Museum metadata reports `isPublicDomain=true`, with the Met Open Access CC0 policy recorded. Hash verification binds the original image to its annotations. The source is Ottoman, attributed to Bursa, Turkey, not Ukrainian or Arabic. Sparse contour annotations remain draft and approximate; no source-image rectification or expert review has occurred.

Run `npm run benchmark:motif:historical` from the repository root. It runs raster preservation, observed annotation reconstruction and micro-part reconstruction using the retained source. The workflow runs the same command and uploads resulting artifacts, including source-mask outputs, graph JSON and reconstructed SVGs. Adding this workflow step does not establish a successful remote run.

The partition benchmark obtains its expected segment multiset directly from the input pixel annotations, separately from the graph conversion. It confirms all 48 annotated segments are retained as 48 editable parts with 48 intact junctions and six nest targets. A 1-reference-unit displacement of one part deliberately produces two broken junctions. Those are coordinate/topology regression measures, not independent image-tracing or aesthetic accuracy. Independent expert annotations, semantic accuracy and image tracing accuracy remain unavailable.

The photograph makes the benchmark reproducible offline. It does not make the draft annotations more accurate. Precise stem/petal decomposition, independently reviewed reference masks, Ukrainian reconstruction permission, physical calibration, stroke widths, fills and machine stitch export remain incomplete. No model training or production approval is claimed.

Local verification passed: `npm run verify:tesseract-worker` (142 engine tests, engine typecheck/build, production pilot, stitch-engine typecheck and 22 stitch tests); `npm run benchmark:motif:historical` (all three benchmarks). The committed partition report is `docs/benchmarks/motif-partition-met-445264.json`.
