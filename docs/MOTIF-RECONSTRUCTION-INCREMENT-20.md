# Increment 20: usable studio construction preview

The development studio now has **Construction lab** in its top navigation.
It provides the first directly usable authored construction template: a central
ASCEND glyph band framed by two smaller repeat bands. Select cuff, collar or
hem-band placement; edit width, height, complexity and seed; generate another
arrangement; download its SVG. Dimensions are user-supplied millimetres and the
SVG retains those physical dimensions.

## How to use

1. Open the development Glyph Studio and choose **Construction lab**.
2. Choose a placement and enter the usable garment-area dimensions.
3. Adjust complexity or generate another arrangement.
4. Inspect the preview and choose **Download reference SVG**.

The downloaded SVG is vector geometry, not a machine stitch file. The lab is
excluded from the cart flow. Stitch count remains unavailable until digitization;
machine, fabric and sew-out review remain incomplete. The live production site
was not deployed by this change.

## Engine integration

`generateReferenceBand` uses existing construction envelopes, production-object
construction/placement, canonical ASCEND primitives, stitch-IR compilation,
canonical SVG preview and manufacturing job planning. Dimensions, complexity,
capacity and machine identifiers are bounded. Uniform glyph scale and rotation
are applied without changing canonical paths; returned path descriptions are
copies so callers cannot mutate the primitive registry.

Framing and differentiated scale are authored construction choices informed by
the user screenshot study and separately attributed Norwegian placket study.
The output is a contemporary ASCEND composition, not a reproduced historical
Norwegian/Ukrainian pattern or an independently validated cultural synthesis.
The experimental learned models are **not** activated in this template.

Manufacturing planning still executes; the result explicitly remains REFERENCE
and its validation is blocked pending digitization/sew-out. The engine accepts
an optional machine profile for feasibility checks, but this first UI does not
yet offer machine selection. Collar/cuff placement is a flat usable-area preview,
not full garment wrapping, seam registration or a 3D fit demonstration.

## Verification

- Engine typecheck/build and 50 test files with 182 passing tests.
- Existing production pilot and web TypeScript/Vite production build.
- Real Playwright browser check: Construction lab opens; width/height edits
  update the result; another arrangement changes the SVG; reference SVG download
  succeeds; no page errors.
- Desktop and 390-pixel mobile views inspected; mobile horizontal overflow check
  passes. Preview screenshots and the downloaded example are retained under
  `data/research/motif-benchmarks/construction-lab-v1/`.

The web bundle still triggers Vite's existing large-chunk advisory; the build
completes. No production deployment, live model promotion or Neon write occurred.

Remaining work: richer compound motifs within repeat cells, learned model
comparison/selection, machine/fabric controls, garment-specific placement,
digitization and verified machine exports. This increment makes one explicit
construction workflow usable; it does not establish those later capabilities.
