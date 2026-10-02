# Glyph Geometry Verification Protocol

The user-supplied ASCEND atlas sheets are the visual source of truth.

## Digital geometry gate

For each source fragment:

1. Preserve atlas identity and exact pixel crop bounds.
2. Reconstruct the intended geometry as SVG paths.
3. Normalize the SVG viewBox without changing proportions.
4. Render SVG at the source crop dimensions.
5. Register source and render by centerline/anchor.
6. Compare silhouette and negative space using an alpha/mask overlay.
7. Record intersection-over-union and pixel-difference metrics.
8. Inspect centerline, symmetry where intentional, intersections and endpoints.
9. Remove only raster artifacts (anti-aliasing, blur, compression noise); do not redesign.
10. Flag ambiguous fragments for human review.
11. Promote only passed geometry to `canonical-digital`.

A numeric similarity score is evidence, not authority. A vector may score highly while losing an intentional gap or intersection, so structural checks are mandatory.

## Production gate

`canonical-digital` does not mean embroidery approved. Production approval additionally requires scale/line/gap validation, digitization and a physical sew-out on the target material.

## Provenance

Every derived glyph stores the IDs and transforms of its source glyphs. Source glyphs are immutable after canonical promotion; corrections create a new version.
