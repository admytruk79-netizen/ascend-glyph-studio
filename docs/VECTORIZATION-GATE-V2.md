# Exact Vectorization Gate v2

The project now treats vectorization as mandatory completion work, not an optional parallel enhancement.

Rules:
1. The approved raster crop is immutable authority.
2. Reconstruction uses full contour topology (CHAIN_APPROX_NONE); no polygon simplification, smoothing, straightening or symmetry correction.
3. Open-stroke-looking artwork is represented by its actual raster silhouette unless an independently verified centerline reconstruction is available.
4. SVG is rendered back at the exact source dimensions.
5. Raster/vector overlay and topology are reviewed independently.
6. Only passing glyphs advance to geometry-verified/canonical-digital.
7. Embroidery remains a later physical gate.

Pass criteria must include topology equality (holes/components), visual inspection, and extremely low raster difference. Metrics support the decision; they do not make it automatically.
