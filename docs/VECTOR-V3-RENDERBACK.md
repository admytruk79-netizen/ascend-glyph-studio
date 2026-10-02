# Vectorization V3 — Independent Render-Back Verification

Date: 2026-10-02

All 32 V3 SVG candidates were independently rendered back to raster at their exact crop dimensions and compared with the locked binary source masks.

## Result
- Candidates tested: 32/32
- Mean IoU: 0.6790
- Best IoU: 0.7471 (fire-03)
- Worst IoU: 0.6201 (fire-04)
- Geometry promoted: 0/32

The candidates are recognisable but remain below the exact-source standard. Rendered vectors systematically lose source pixels, confirming that contour-to-filled-path reconstruction is still altering thin stroke geometry.

## Decision
V3 is rejected as canonical output. Do not tune thresholds further as the primary solution.

## V4 direction
Use skeleton/centerline extraction for thin line glyphs, fit stroke width from the locked source mask, and use explicit geometric primitives/compound paths for closed regions. Optimize each candidate against render-back error while preserving topology. Human visual review remains mandatory before promotion.

No production status changes.
