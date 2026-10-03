# Canonical SVG -> SpatialGlyph Gate

The spatial engine is now wired to the registry contract.

A registry glyph can become a SpatialGlyph only when BOTH are true:
- status = canonical-digital
- vectorStatus = geometry-verified

Pending source rasters and unreviewed vector candidates fail closed. No placeholder path, reconstructed approximation, or glyph ID text may enter the 3D geometry pipeline as canonical artwork.

Spatial recipes are derivative metadata only: recipe version, extrusion depth, bevel and curve resolution. They do not alter the canonical glyph identity or asset key.

Next adapter boundary: load the verified SVG asset, parse its path/compound-path geometry, preserve holes/open-vs-closed semantics, and emit renderable shapes/meshes while retaining the canonical reference.
