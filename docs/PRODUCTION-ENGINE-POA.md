# ASCEND Tesseract Production Engine — Plan of Action

Updated: 2026-10-27

## Objective
Deliver one end-to-end production path first: configurable men's long-sleeve linen shirt -> body/size state -> pattern pieces -> ASCEND semantic intent -> garment-level composition -> cross-zone continuity -> embroidery feasibility -> production package -> physical sample feedback.

## Definition of pilot production
A configuration is pilot-production-ready only when it has:
1. resolved garment measurements and pattern-piece geometry;
2. explicit editable/no-go zones and seams;
3. Tesseract Design Genome plus zone-specific composition;
4. seam/wrap registration plan;
5. machine/material capability validation;
6. dimensioned vector placement package;
7. traceable source/confidence for reference measurements;
8. physical sew-out/sample status. Digital validation alone is not production approval.

## Workstreams

### P0 — execution bridge
- runnable batch entry point;
- execute deterministic candidate search;
- persist synthesis candidates and provenance;
- export SVG artifacts and run manifest;
- CI/test runner.

### P1 — shirt geometry
- men's long-sleeve pilot block;
- body measurements: neck, chest, waist, shoulder, sleeve, bicep, wrist, shirt length;
- garment measurements: collar, yoke, chest/midsection/bottom widths, sleeve width/length, cuff, front/back length;
- ease, shrinkage allowance, sewing tolerance;
- pattern pieces: left/right front, back, yoke, left/right sleeve, cuffs, collar/band, placket;
- seam allowance, grain direction, seam IDs, assembly adjacency;
- 5 pilot sizes, then custom measurement resolution.

### P2 — pattern-aware projection
- normalized coordinates -> pattern-piece coordinates;
- tapered sleeve/cuff/collar wrapping;
- cross-seam continuity and registration;
- scale reflow rather than blind scaling;
- no-go zones for buttons, buttonholes, seam allowances and construction interference.

### P3 — embroidery compiler
- machine envelopes and frame types;
- minimum feature/stroke/gap capability;
- stitch-density/underlay recipe as manufacturer-validated data;
- segmentation and registration;
- flat-before-assembly vs finished-garment embroidery;
- process confidence states.

### P4 — production package
- dimensioned SVG master;
- per-piece placement SVG;
- seam/registration map;
- thread/color/material manifest;
- machine/process assumptions;
- candidate/provenance manifest;
- production checklist;
- machine-file digitization remains a validated downstream stage until stitch-generation is proven.

### P5 — physical validation loop
- sew-out;
- measure distortion, registration error, shrinkage and defects;
- attach corrections to material/process/machine combination;
- promote REFERENCE -> PATTERN-SPECIFIED -> SAMPLE-MEASURED -> MANUFACTURER-VALIDATED -> PRODUCTION-VALIDATED.

### P6 — customer experience
Garment -> Fit -> Construction -> Material -> Meaning -> Design -> Review.
Advanced controls stay hidden unless requested.

## Data acquisition policy
Use primary/manufacturer or technically authoritative sources first. Every numeric datum stores source, retrieval date, units, confidence and validation state. Never silently convert reference data into ASCEND production truth.

## Initial verified reference inputs
- Proper Cloth measurement model: collar, sleeve, shoulder, chest, midsection, length, sleeve width, cuff plus posture/fit variables.
- Proper Cloth publishes shirt sewing tolerances and distinguishes flat widths from full circumferences.
- Brother PR1055X: 14 x 8 in maximum embroidery area; up to 1000 spm.
- Tajima TMBP2-SC: 360 x 500 mm border/tubular field and support for tubular finished products such as sleeves.
These remain REFERENCE until validated against the actual ASCEND manufacturer/machine setup.

## Data still required
1. A legally usable pilot shirt pattern/block or ASCEND-created pattern geometry.
2. Actual fabric supplier specifications: composition, GSM, width, shrinkage/finishing behavior.
3. Actual embroidery manufacturer's machine/frame inventory.
4. Manufacturer's digitizing rules: thread/stabilizer/needle, minimum satin width, fill density, underlay, max practical stitch count, registration tolerance.
5. Physical sample measurements and sew-out results.
6. Final pilot construction choices: collar, cuff, placket, seams, buttons/closures.
7. Commercial parameters later: BOM, labor, MOQ, lead time, packaging, QC tolerances.

## Current implemented foundation
- Tesseract 8D state and semantic intent compilation.
- knowledge retrieval/provenance guardrails.
- topology generation, mutation, constraints, novelty/evaluation.
- Design Genome and SVG projection.
- garment configuration and compatibility model.
- garment-zone grammar.
- cross-zone continuity graph.
- manufacturing envelope/planning model.
- material/machine reference schema and physical validation schema.
- live Neon production schema.

## Immediate build order
1. stabilize the production-object compiler path on `tesseract-staging`;
2. bind garment + material + machine templates into the construction envelope;
3. compile octave-controlled topology into production objects rather than SVG-first geometry;
4. adapt production objects into stitch-engine run/satin/fill objects;
5. regenerate stitches after every scale/placement change;
6. run deterministic complete-shirt and sleeve benchmarks against the 3.7 golden baseline;
7. produce one machine-specific pilot package with DST, tech pack, placement, stitch/thread math and manifest;
8. perform the first physical sew-out and store measured corrections;
9. replace reference machine limits with the selected manufacturer's validated machine templates;
10. only then promote staging to production.

## Non-negotiable
The engine may generate and rank aggressively, but it may not label a result production-approved without physical/manufacturer validation.


## Machine-template contract

A machine is part of the construction input.

Each template must record:
- maker/model and confidence state;
- embroidery field;
- head and needle count;
- supported frames;
- tubular and finished-sleeve capability;
- supported file formats;
- maximum colors;
- practical SPM;
- registration tolerance;
- practical stitch/run ceiling;
- material/process recipes validated on that machine.

Reference values may guide prototypes but cannot become production truth without manufacturer or sew-out validation.

The generator uses the selected template before creating geometry. If a machine cannot execute a requested construction directly, the constructor must choose a legal alternative such as flat-before-assembly, registered segmentation, reduced color plan, or a different machine profile. It must not create an impossible design and leave the factory to discover the problem.


## Development checkpoint — 2026-10-23 (PR #31, NOT promoted)

- Implemented seam-aware rhythmic repetition in `rhythmic-production-repeats.ts`. Repeated placements are cloned from already placed ASCEND production glyphs, keep the same `geometryRef`, and are compiled to stitch IR before final surface validation and machine planning. Their IDs retain the original glyph ID plus `:rhythm:` placement lineage. No new reference motifs, cultural claims or canonical paths were introduced.
- Added deterministic tapered-sleeve/seam/clearance tests and corrected the semantic-node-budget regression to distinguish original semantic topology (maximum 12) from independent physical repeat placements (bounded by the construction envelope).
- GitHub Actions on commit `fab95a8`: engine TypeScript check/build passed, Tesseract unit suite **101/101 passed**, pilot CLI executed, stitch-engine checks/tests passed, optimizer-validation workflow passed, web and glyph CI passed. Production metadata assertion also passed.
- **Visual regression still FAILED**: isolated sleeve run `b1f4b441-a10a-4a78-87fd-6d746625f1c7` produced 12 candidates, **0/12 raster survivors**, mean raster quality **0.5704** (3.7 golden threshold **0.82**), mean clutter **0.1471** (maximum **0.10**), and **5** tangled candidates (maximum **0**). The raster coverage remains too sparse; these repeated primitives are not a substitute for hierarchical connected ornament. Do not promote this branch.
- **Next P0/P3 task**: build a physically constrained macro/meso/micro motif-assembly grammar that increases canonical stitch-IR coverage and connection quality, then rerun the exact same sleeve/full-shirt benchmark without relaxing the 3.7 thresholds. Separately verify stitch-count/hoop limits and a manufacturer-specific sew-out before any production label.
- Manufacturer machine/recipe parameters remain **REFERENCE**. Digital CI, simulated raster metrics and generated DST are not physical sew-out or production validation.

## Development checkpoint — 2026-10-24 (PR #31, NOT promoted)

- Added `hierarchical-production-assembly.ts` and integrated it into `pattern-generator.ts` before canonical stitch-IR compilation. It places existing ASCEND production glyphs at macro (focal), meso (flank), and micro (accent) scales where physical room permits, then uses remaining capacity for rhythmic repeats. Clone IDs and optional `assembly` metadata record placement lineage; `geometryRef`, form, concept ID, and `sourceBasis` remain unchanged. No source glyph paths or unreviewed cultural references were added.
- Digital placement checks cover conservative rotated footprints, tapered-sleeve circumference at both vertical edges, seam/band clearance, existing-object collision, minimum feature size, and scaled satin width. The final stitch-IR surface gate remains authoritative. These numerical constraints are engineering REFERENCE heuristics, not manufacturer-validated recipes.
- Added three deterministic assembly tests and extended the semantic-node-budget regression so semantic nodes remain distinct from physical assembly/repeat placements. Corrected the stitch-object ID path-suffix normalization used in the drawable glyph count.
- Verified GitHub Actions at code commit `d12a78b`: `Tesseract 40-design evaluation` **passed** with 10/10 unique digital outputs in each of four suites (40 total), engine TypeScript check/build passed, Tesseract unit suite **96/96 passed**, Tesseract Pilot passed, optimizer validation passed, Glyph Studio Web and glyph-engine CI passed. This evaluates generation/structural validity, **not** aesthetic quality or sew-out.
- **Production integration visual regression still FAILED**: isolated sleeve run `1eddf4f9-d7a6-4c48-90ee-2433c51fe731` produced 12 candidates, **0/12 survivors**, mean raster quality **0.569892** (minimum **0.82**), mean clutter **0.141977** (maximum **0.10**), and **5** tangled candidates (maximum **0**). Production metadata assertion passed. The 3.7 acceptance thresholds were not relaxed. This is effectively flat versus the prior 0.5704 quality; do not promote.
- Review of generated stitch-IR previews shows that sleeve and narrow-band designs often accommodate macro clones but few or no meso/micro placements; the current assembly is **spatial proximity only**, not sewn connectivity. More repetition cannot substitute for joined, dense, coherent ornament.
- **Next highest-priority task**: design port-aware, stitch-realized connector and submotif grammar with explicit lineage and clearance/underlay safeguards, capable of composing branches/nesting without editing canonical ASCEND paths. Evaluate the exact sleeve/full-shirt 3.7 raster baseline again, inspect actual stitch-IR coverage, and retain a fail-closed manufacturing gate. Separately obtain manufacturer-specific hoop, thread, stabilizer, digitizing recipe and physical sew-out evidence before any production label.
- All current machine/material limits and visual measurements remain REFERENCE or digital-validation evidence; no physical sample, manufacturer acceptance or production approval has occurred.

## Development checkpoint — 2026-10-25 (PR #31, experimental connectors NOT promoted)

- Implemented `port-aware-stitch-connectors.ts`: source-derived ASCEND ports are transformed into garment millimetres and may be joined by actual run-stitch IR objects. Connection lineage records source/target glyph IDs, source port IDs, geometry references, primitive source status and `validationState: REFERENCE`. Source primitive paths, corpus/cultural provenance and original production glyphs are unchanged.
- Conservative digital guards require facing ports, bounded span, same thread color, in-band and tapered-seam clearance for BOTH anchor footprints, and exact polyline-segment collision exclusion against third-party glyph bounding boxes. Only intentional endpoint overlaps are permitted by the existing final stitch-IR surface gate. Stitch travel and manufacturing planning consume connector IR, not decorative SVG.
- Added five deterministic connector regression tests covering source lineage, canonical immutability, physical IR and job presence, narrow intervening obstacles, taper/seam/band rejection, unsupported provenance, zero budget and cross-color refusal. Manufacturer-specific stitch/underlay parameters are NOT inferred from this algorithm.
- GitHub Actions on code commit `4203228` verified Tesseract typecheck/build, **108/108 unit tests**, optimizer validation, smoke SVG exports, and production metadata. The smoke export contained 3 and 4 real connector paths in two band SVGs. However the exact sleeve 3.7 integration raster benchmark **FAILED**: run `4ae507af-fd77-4f17-90c2-e37a67f194a8`, 12 candidates, **0/12 survivors**, mean quality **0.513873**, clutter **0.180721**, **5 tangles**. Baseline requires at least 11/12 survivors, quality >=0.82, clutter <=0.10 and 0 tangles.
- Consequently `enablePortConnectors` is **explicit opt-in, OFF by default** as of commit `186fae1`. Follow-up guard/test commits `05265eb` and `c1f0b59` reject cross-color links. GitHub Actions on `c1f0b59` verified Tesseract typecheck/build, **109/109 tests**, optimizer validation, web and glyph CI; the default-off sleeve integration raster benchmark still **FAILED**: run `2e5948a0-3b8d-4797-bdff-7997f49b8649`, 12 candidates, **0/12 survivors**, mean quality **0.539823**, clutter **0.163473**, **5 tangles**. The two runs do not establish aesthetic improvement.
- Technical reference: Ink/Stitch documents running/bean stitch as a colored stroked path with configurable stitch length, repeats, routing and lock stitches: https://inkstitch.org/docs/stitches/running-stitch/ . This supports the neutral run-path representation, NOT the selected 2.5 mm default as manufacturer-validated or a physically approved sew-out.
- **Next highest priority**: address the root raster failure (very low physical stitch coverage and disconnected focal hierarchy), not increase the number of loose connector lines. Develop a constrained branch/leaf/negative-space grammar with a measured garment-zone coverage budget, explicit stitch topology and collision-safe junctions. Compare opt-in connector vs no-connector variants using the SAME fixed seeds and the unmodified 3.7 raster gate. Preserve fail-closed surface/manufacturing checks and keep PR #31 draft until it passes.
- All machine/material values remain REFERENCE; no manufacturer calibration, physical sample or production approval has occurred.

## Development checkpoint — 2026-10-26 (digital coverage instrumentation, NOT promoted)

- Added `stitch-coverage-budget.ts` to measure coarse raster occupancy of the **final physical stitch IR** in the actual sash band, with tapered-circumference and seam-gap masking. Reports motif-mark coverage, connector and framing coverage separately, horizontal/vertical motif span, longest empty column run, and left/center/right distribution. This addresses the missing evidence behind the repeated 3.7 raster failures; it does **not** yet solve weak artistic composition.
- This is a bounded **DIGITAL_RASTER_ESTIMATE**, not embroidery stitch density, thread coverage, machine calibration, manufacturing feasibility or physical sew-out. Running/satin marks are sampled with a cell-diagonal margin; grid resolution and estimates must not be treated as millimetre-accurate thread deposition. No visual acceptance threshold or candidate score was changed.
- `pattern-generator.ts` now attaches `coverageBudget` to generated candidates; `run-tesseract-worker.ts` persists it in candidate state, includes it in paired-raster diagnostic logs, and exposes it in the run API. Helper rails and experimental connectors are explicitly excluded from **motif** coverage, preventing decorative linework from masking sparse canonical motifs.
- Added deterministic regression tests for source immutability, helper exclusion, run/satin/fill geometry, taper/seam masking and malformed inputs. Code commits `2a48f19`, `b8842c4`, `ca9f322`, `78a5d59`, `1c7a99a`; CI status must be checked against the latest head before claiming a pass. Earlier intermediate runs may be cancelled by workflow concurrency.
- **Next P0/P3 priority:** execute the unchanged fixed-seed sleeve and full-shirt 3.7 benchmark; inspect coverage-budget diagnostics alongside raster quality, clutter and tangles; then build a collision-safe branch/leaf grammar with deliberate negative-space distribution using existing ASCEND geometry and provenance. A higher digital mark fraction alone is NOT visual acceptance.
- Manufacturer-specific machine limits, fabric/underlay/needle recipes and physical sew-out evidence are still absent; all current engineering heuristics remain REFERENCE. PR #31 remains draft and production promotion remains blocked.

## Development checkpoint — 2026-10-27 (experimental branch/leaf placement, NOT promoted)

- Added `coverage-aware-branch-leaf.ts` and an **explicitly opt-in**, default-OFF `enableCoverageAwareBranchLeaf` generator flag. It places clusters consisting of an existing ASCEND branch/bifurcation stem and one or two existing ASCEND seed glyphs, all compiled as physical production objects into canonical stitch IR. It never copies paths from reference embroidery images and does not invent new ASCEND geometry.
- The planner balances **nominal bounding-box footprint** across garment thirds, reserves negative space with global/third occupancy ceilings, and checks band, tapered-sleeve edges, seam margins, minimum features, scaled satin widths, and pairwise rotated-box clearance. Atomic clusters cannot emit an isolated stem. These are conservative DIGITAL REFERENCE heuristics, not a calibrated thread-coverage or machine recipe.
- Clone IDs, unchanged `geometryRef`/`sourceBasis`, `assembly` and `branchLeaf` lineage retain the source and record `validationState: REFERENCE`. The underlying source primitive status is preserved. Clusters are **spatially adjacent but NOT sewn together**; there is no implied port connection, underlay, or physical approval. Rhythmic source selection excludes cluster clones so it cannot misattribute their lineage.
- Regression tests cover deterministic cluster placement, source immutability, actual stitch-IR compilation, increased **digital estimated** mark coverage in a synthetic fixture, tapered sleeve/seam/collision checks, and fail-closed invalid provenance/capacity. On code commit `ef0e054`, GitHub Actions `Tesseract engine CI` verified TypeScript/build and **116/116 engine tests**, plus pilot, stitch-engine verification and production metadata checks. Optimizer validation, web and glyph workflows passed.
- **The unchanged 3.7 integration benchmark still FAILED** on `ef0e054`, run `f4d7a3cb-a959-4d68-9001-ed314c2bd5b0`: **0/12 survivors**, mean raster quality **0.539823** (required >=0.82), clutter **0.163473** (maximum 0.10), **5 tangles** (required zero). This run used the default-OFF setting, so it is a baseline preservation check, **not an evaluation of the new grammar**. No improvement claim is supported.
- The worker now reads `intent.enableCoverageAwareBranchLeaf` and logs the experimental state; `scripts/create-staging-benchmark-run.mts` accepts `TESSERACT_EXPERIMENT_BRANCH_LEAF=1` to create an explicitly tagged fixed-seed sleeve experiment, while omitted/0 retains the old default. This provides an A/B execution path. The first fixed-seed sleeve comparison has now run; see the results below. The complete-shirt A/B fixture is still to be implemented.
- **Next highest priority:** run fixed-seed paired sleeve and complete-shirt 3.7 comparisons with the branch/leaf flag ON versus OFF; measure final canonical stitch-IR coverage by third, raster quality, clutter, tangles, and rejected candidates. If there is no improvement, retain OFF and redesign port-aware, collision-safe sewn junctions without editing canonical paths. Keep the 3.7 gate unchanged and PR #31 unpromoted.
- Manufacturer-specific machine, hoop, fabric, thread, stabilizer, needle, underlay and registration parameters are still REFERENCE or missing. No physical sew-out or manufacturer/production validation has occurred.

## Development checkpoint — 2026-10-27 (fixed-seed sleeve A/B and provenance correction, NOT promoted)

- Added a **non-promoting** opt-in branch/leaf A/B diagnostic to `.github/workflows/tesseract-engine-ci.yml`. The original 3.7 gate still runs unchanged and fails closed. Both arms use the same golden seed and sleeve machine/reference configuration; `TESSERACT_EXPERIMENT_BRANCH_LEAF=1` changes only the experimental arm. The worker logs the actual flag, branch/leaf placement counts and raster outcomes.
- First verified comparison on code commit `d7f74c1`, GitHub Actions run `40545427230`: **OFF** run `cc15f912-5725-48b8-b441-eae39855931a` had 0/12 survivors, mean quality **0.539823**, clutter **0.163473**, **5** tangles. **ON** run `98fb61a0-be2b-4206-ac0e-d366d5327e91` had 0/12 survivors, mean quality **0.552106**, clutter **0.155754**, **4** tangles. The quality difference is **not evidence of successful branch/leaf grammar**: the 12 persisted top-ranked ON candidates contained **zero** branch/leaf placements, so the difference can be caused by the changed hierarchy allocation/selection. Neither arm meets the unmodified 3.7 thresholds.
- To expose the actual experimental placements rather than silently drop them from evaluation, added `experimental-candidate-sampling.ts` and deterministic tests. The opt-in generator reserves up to two physically valid branch/leaf designs for raster diagnosis without raising scores or weakening any acceptance gate. Four real branch/leaf candidates were raster-tested across three feedback passes (8–11 cloned placements each); **all four failed**, with raster quality **0.577, 0.256, 0.526, 0.382** and persistent sparsity (plus tangles on two). These are digital results, not physical stitch coverage.
- Corrected a provenance bug in `rhythmic-production-repeats.ts`: repeats of assembled glyphs no longer inherit false `assembly` status. Each repeat now records `rhythm.sourceObjectId`, unchanged source `geometryRef` and `validationState: REFERENCE`. The placement/stitch geometry was not changed by this correction. Added a regression test.
- GitHub Actions `40545427230`: engine TypeScript/build and pilot verification passed; **120/120 Tesseract tests in 41 files passed**; stitch-engine verification, production metadata, optimizer, web and glyph workflows passed. The overall Tesseract engine CI **failed only at the enforced 3.7 visual gate**. No release or production promotion occurred.
- **Next highest-priority P0/P3 item:** replace spatially adjacent, disconnected branch/leaf placements with a genuinely sewn, source-port-aware junction/branch grammar, with controlled negative-space budgeting and collision-safe routing. Benchmark actual canonical stitch-IR output with the same fixed seeds; reject improvements that increase tangles or merely boost nominal footprints. Add a complete-shirt A/B fixture. Keep experimental features OFF by default until the gate passes.
- Source primitive statuses, cultural/provenance guardrails and manufacturer/production validation states remain unchanged. No manufacturer-specific thread/stabilizer/underlay calibration or physical sew-out is available; all placement heuristics and raster marks are **REFERENCE/digital evidence**, never production approval.
