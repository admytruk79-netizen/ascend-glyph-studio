# V4 Stroke Reconstruction Execution

V4 is the active reconstruction path for thin-line glyphs.

Initial execution order:
1. Water 01–05
2. Air 01–06
3. Fire stroke-dominant glyphs
4. Earth geometric primitives
5. Spirit compound/orbital hybrids

V4 extracts a centerline skeleton, identifies endpoints/junctions, traces graph edges, estimates stroke width from the locked raster using a distance transform, and emits stroke-based SVG. This directly addresses V1–V3's filled-contour failure.

The emitted SVG remains a candidate until independent render-back and visual/topological review. Exceptions are manually reconstructed; there will be no return to threshold-only outline tracing.
