# Tesseract stitch source-viewBox gate (open P0)

Date: 2026-10-09. Status: **NOT RESOLVED / NOT MANUFACTURER VALIDATED**.

## Finding
`packages/tesseract-engine/src/production-stitch-ir.ts` currently converts ASCEND SVG paths to physical coordinates by assuming source path coordinates are centered on (50,50) in a 100 x 100 viewBox. `primitiveForForm` can return a corpus-canonical primitive with a different `viewBox`. For those sources the resulting stitch positions and scale can be wrong. When physical width and height differ, independent X/Y scaling can distort the motif.

This is separate from the fixed invented-triangle fallback. The existing parser correctly rejects unsupported commands and missing geometry; tests for those guards were added to `tesseract-staging` in October 2026.

## Required acceptance gate
1. Parse the **actual** primitive `viewBox` into finite minX/minY/width/height and reject invalid dimensions.
2. Use the declared viewBox to center the source geometry in millimeters. Preserve aspect ratio by uniform scaling unless the canonical geometry explicitly permits deformation.
3. Validate finite physical dimensions, rotation and placement; reject non-finite transformed points.
4. Add tests for non-100 viewBoxes, translated and rotated placements, aspect preservation and invalid input. Regenerate the stitch geometry after each physical placement or scale change.
5. Preserve source IDs and canonical/provisional status. The engine must not label source-derived-provisional geometry canonical or manufacturing approved.
6. Run complete engine CI and staging benchmark before integration. Physical sample and manufacturer validation are **separate gates**.

## Current verification
At staging commit `ced9d79`, the geometry-guard tests, Tesseract engine CI and pilot workflow passed. The staging benchmark passed on 2026-10-09, with 12 candidates and 0 approved canonical source geometries. This does not validate a source-viewBox mapping fix; none has been merged.

## Production release rule
Do not treat reference machine recipes, pilot DST exports or digital quality scores as physical sew-out approval. Machine and fabric validation remain outstanding.
