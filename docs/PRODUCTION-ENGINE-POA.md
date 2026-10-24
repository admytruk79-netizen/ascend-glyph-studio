# ASCEND Tesseract Production Engine — Plan of Action

Updated: 2026-10-08

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
