# Atlas Geometry Verification — Pass 1

Date: 2026-10-02
Scope: all 32 visible atlas fragments.
Authority: five supplied atlas raster sources.
Method: render reconstructed contour geometry at source-crop dimensions, overlay against source, inspect silhouette/negative space/intersections/endpoints, and record pixel overlap/difference as supporting evidence only.

## Result
**0/32 promoted to canonical-digital in Pass 1.**

This is intentional. The exact-source rule forbids approving a reconstruction merely because it is recognisable. The first reconstruction introduces visible contour/fill artifacts in multiple glyphs and smaller endpoint/edge differences in the stronger matches. Therefore every fragment remains raster-reconstructed / needs-review.

Most obvious failures requiring reconstruction changes:
- Air: 01, 02, 04
- Fire: 03, 05
- Water: 03
- Spirit: 02, 05

Stronger first-pass matches, still NOT promoted under exact-source policy:
- Air: 03, 05, 06
- Fire: 01, 02, 04, 06
- Earth: 01, 02, 03, 04, 05, 06, 07, 08, 09
- Water: 01, 02, 04, 05
- Spirit: 01, 03, 04, 06

## Required correction
Do not use filled contour approximation as the canonical reconstruction path. Reconstruct strokes/closed regions in a topology-preserving representation, preserve holes and open strokes, then rerender and repeat independent visual comparison. No source glyph is available to production rendering until this gate passes.

Status chain remains:
raster-reconstructed -> geometry-verified -> canonical-digital -> digitized -> sew-out-validated -> production-approved.
