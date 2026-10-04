# ASCEND Tesseract Production Engine — Plan of Action

Updated: 2026-10-03

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
1. implement pattern-piece + seam graph types;
2. implement pilot shirt measurement resolver;
3. map garment zones to pieces;
4. implement piece-aware projection and no-go clipping;
5. add production-package manifest;
6. run first deterministic complete-shirt candidate batch;
7. produce first sample package;
8. incorporate manufacturer and sew-out feedback.

## Non-negotiable
The engine may generate and rank aggressively, but it may not label a result production-approved without physical/manufacturer validation.
