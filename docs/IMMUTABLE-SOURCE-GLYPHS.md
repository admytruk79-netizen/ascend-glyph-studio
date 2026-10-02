# Immutable Source Glyph Contract

The 32 atlas fragments are source glyphs. Canonical SVG geometry must match the supplied atlas artwork. Vectorization may remove raster anti-aliasing but must not straighten, symmetrize, smooth, simplify, or reinterpret intentional geometry.

The generator does not rewrite source SVG paths. Derived glyphs reference immutable source IDs plus transforms and layer order. If source pixels are ambiguous, the fragment remains unresolved rather than guessed.

After canonical lock, a correction creates a new source version; existing designs continue referencing the version from which they were built.
