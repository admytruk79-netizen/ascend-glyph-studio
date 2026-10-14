# Sparse observed historical annotations

This increment adds an explicit observed-annotation schema and adapter into the existing typed MotifGraph/reconstruction engine. The committed fixture is a **draft manual visual annotation** of Met Textile Fragment 445264 (Ottoman, attributed to Bursa, Turkey, 16th century), not an Arabic or Ukrainian reference and not an expert-reviewed dataset.

Seven approximate outer envelopes are recorded: three scalloped medallions, three floral connectors and one central inset. Coordinates refer to the 225 x 624 museum photograph identified by its SHA-256. Labels are visual hypotheses, not historical iconographic identifications. Nested annotation assemblies encode spatial containment. No stitch junctions, repeat relations or hidden components are inferred.

`graphFromObservedAnnotations` checks source provenance through the existing graph gate, image-coordinate bounds, unique IDs, hierarchy/cycles and confidence. Observed contours remain reference geometry. The supplied width normalizes pixel coordinates into graph units and does not establish physical scale. An annotation review status is caller-supplied evidence, not independent verification.

Run `./node_modules/.bin/tsx scripts/benchmark-motif-observed.ts` from the repository root to emit an SVG, graph and report under `artifacts/motif-reconstruction/observed-met-445264`. The benchmark checks reconstruction against supplied landmark coordinates. Zero coordinate RMSE establishes correct coordinate preservation only; the coarse outlines have not been evaluated against an independent contour annotation. Image tracing accuracy, semantic accuracy and physical calibration are explicitly null.

Tests cover exact coordinate preservation, nested hierarchy, prohibited inferred connectivity, deterministic results, unchanged inputs, confidence capping, cyclic/missing parent annotations, out-of-image points and denied source permission. Canonical ASCEND geometry and production approval behavior are unchanged. No model training was performed.

Next work: precise source-linked contours and stems/petal decomposition, independent review masks/landmarks, containment and connection evidence, and a Ukrainian fixture with correctly captioned attribution. Do not generate additional ornament by extrapolating these seven coarse envelopes and claim it reconstructs the historical object.
