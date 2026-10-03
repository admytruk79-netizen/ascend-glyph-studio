# ASCEND Spatial Glyph & Tesseract Projection Architecture

## Decision
Canonical 2D glyph geometry remains the immutable identity. Spatial and manufacturing forms are deterministic derivatives.

Pipeline:
`canonical SVG -> SpatialGlyph recipe -> 3D mesh -> Tesseract 4D relational state -> projection -> 2D/3D/manufacturing output`

## Invariants
1. Spatial generation never mutates canonical SVG path data.
2. Derived assets retain glyph id + canonical version + recipe version.
3. Same source/version/recipe/seed yields the same spatial state.
4. W is ASCEND relational depth, not glTF quaternion W.
5. 4D state is projected to 3D before glTF export.
6. Manufacturing approval remains independent of visual/spatial validity.

## SpatialGlyph
A SpatialGlyph references one canonical glyph and a recipe: extrusion depth, bevel, curve resolution, and anchor metadata. Closed paths may become extruded solids; stroke glyphs require deterministic stroke geometry before extrusion.

## Tesseract state
Each instance carries position [x,y,z,w], 3D quaternion rotation [x,y,z,w], uniform scale, parent/relationship metadata and canonical source reference. Relationships (anchor, nest, orbit, intersect, bridge, oppose, mirror, radiate, flow, enclose, repeat) generate constraints rather than new source geometry.

## Projection
Projection is explicit and versioned:
- 4D -> 3D spatial projection
- 3D -> 2D garment/print projection
- 3D -> GLB/glTF scene
- 2D canonical -> embroidery/print derivatives

## Interchange
glTF/GLB is the preferred runtime 3D interchange target. ASCEND does not use glTF as the canonical glyph source.

## Implementation sequence
1. Finish canonical SVG verification.
2. Build pure spatial types and deterministic 4D projection math.
3. Add SVG-to-shape adapter.
4. Add Three.js preview adapter.
5. Add GLB export.
6. Connect spatial compositions to Studio.
7. Add manufacturing-specific relief/emboss/print projections only after process constraints exist.
