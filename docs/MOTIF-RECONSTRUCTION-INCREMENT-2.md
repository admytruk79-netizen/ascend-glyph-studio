# Motif reconstruction increment 2: inference and feasibility

Development branch: `codex/motif-graph-reconstruction`, draft PR #22. This follows increment 1 and integrates `docs/codex/MACHINE-FEASIBILITY-HANDOFF.md`. Every reference, graph, benchmark and pilot output remains **REFERENCE**; no historical-image training or physical production approval is claimed.

## Runtime changes

- `planEmbroideryJob` accepts an optional full machine template and rejects invalid field dimensions/units, oversized single-hoop envelopes, invalid or exceeded color capacity, and missing/unsupported format declarations. Either field orientation may fit; this check does not rotate the emitted commands or plan registration. Unknown explicitly requested generator/batch profiles fail closed.
- Copied the four proposed regression tests into the actual test suite, then expanded boundary, malformed metadata, capacity and integration coverage. Weaving job planning is unchanged; the physical layout correction below is limited to embroidery.
- Embroidery batch zone placement now uses physical millimetres instead of the display canvas minimum width/height. The full-shirt benchmark exposed placket/cuff coordinates outside their real zones when the previous minimum 160 mm canvas width was used.
- Embroidery batch zones retain manufacturing job plans from their final stitch IR. The pilot manifest inherits the selected reference profile and keeps invalid zone jobs as production blockers. Contradictory selected and packet machine identities reject the packet. No silent multi-hoop approval is possible through these checks.
- Motif assembly accepts an explicit full machine template, passes it through the same planner, and rejects a missing/mismatched template when its construction envelope declares a machine. It still blocks canonical-layout approval.

## Motif continuation

- Added an explicit `ascend.motif-provenance.v1` discriminator and stricter attribution, hierarchy, node/relation type, inherited-port and transform-overflow guards.
- Added optional translation-lattice inference to `decomposeAnnotatedMotif(..., {inferRepeats: true})`. At least three compound assemblies must share a parent, provenance set, world-relative element paths, ports, nesting depth and internal junctions. The algorithm infers constant 2D translation steps only; segmentation is supplied by annotations. It keeps existing repeat annotations, records evidence/transformation history, and bounds confidence by the input/source metadata. Confidence is not a trained/calibrated probability.
- Added analytical observed-polyline centreline gap/crossing measurements, off-path port checks and transformed envelope checks. Declared, attached junctions exclude only a bounded neighbourhood (radius `max(minGapMm, 0.000001)`); remote collisions in the same connected pair still fail. Separated nested outlines are not falsely rejected merely because bounding boxes overlap. Protected negative space remains measured separately.
- Invalid reference junction/repeat/negative-space/gap/port/envelope constraints add `motif-reference-layout-invalid` to mapped jobs. Reference constraints do not certify the separately mapped canonical geometry: `motif-canonical-layout-unvalidated` remains mandatory.

## Verification

Installed fresh repository dependencies using Node 22, including the declared Vitest 2 dependency. Final commands:

```sh
npm run verify:tesseract-worker
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck scripts/benchmark-motif-reconstruction.ts
npm run benchmark:motif
```

These commands were executed under Node 22.23.3. Full worker verification includes Tesseract typecheck/build/tests/pilot and stitch-engine typecheck/tests. Logs are in `artifacts/motif-reconstruction/{verification,benchmark}.log`; the PR benchmark workflow retains logs and generated JSON/SVG artifacts. Local results: **124 Tesseract tests across 34 files, 22 stitch-engine tests, typechecks and build passed**. The existing default reference pilot completed without errors and retained `productionApproved: false`.

The v2 report at `docs/benchmarks/motif-reconstruction-v2.json` records measured scores and blockers. Synthetic vector RMSE is zero; the withheld repeat is recovered without geometry changes. Injected junction, repeat, protected-space and gap faults are detected. Four seeded sleeve candidates are deterministic and blocked for oversized single-hoop envelopes. The reference full-shirt run yields two deterministic candidates and 15 zone jobs; ten zones require segmentation and five pass the initial envelope/color/format checks. No zone has outside-envelope coordinates in this fixture after the physical-coordinate correction. All nine separately mapped motif piece jobs still have the canonical-layout blocker.

The full-shirt run exercises the existing engine and packet generation; it does **not** project the reconstructed motif onto the garment. Piece artwork layers remain placeholders. Passing initial job checks is not manufacturing approval or a complete digitizing/material/registration assessment.

## Still incomplete

Permission-verified historical images and retained originals; raster decomposition/rectification and human cultural/aesthetic review; source-disjoint evaluation; raster fidelity and tracing/tiling/SVG-first comparisons; symmetry and non-translational repeat inference; stroke/fill-aware clearance and canonical port remapping; actual motif placement through shirt zones/no-go areas/seams; registered multi-hoop segmentation; actual selected machine/frame/access/material validation; machine stitch files/counts; model training, sew-out and production approval. The Neon-backed 3.7 visual gate was not run; these offline metrics do not substitute for it.
