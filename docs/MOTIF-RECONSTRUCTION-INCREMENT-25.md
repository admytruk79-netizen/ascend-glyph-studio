# Increment 25 — source-fragment jigsaw

Development branch: `codex/motif-graph-reconstruction`. State: REFERENCE.

## Approach and implementation

The default studio assembly now uses detailed source-derived pieces. Six explicitly selected crops from Samokysh's Ukrainian ornament plates 27 and 37 (1902) supply two bouquets, two branching compounds and two scrolling border segments. These are a new arrangement of attributed historical shapes, not newly invented shapes or canonical ASCEND glyphs.

`motif:fragments:extract` verifies retained original-image SHA-256 and existing per-item analysis/reconstruction permissions. It resizes each crop to 144 pixels wide, applies documented draft paper/pigment thresholds and quantizes pigment to five colours. Existing `graphFromMotifMaskContours` traces exact cell boundaries and retains holes. Each binary colour mask is independently reconstructed through the existing polygon rasterizer and compared pixel-for-pixel. The masks are exact relative to the threshold-selected raster, not expert embroidery segmentation or the original full-resolution image.

`assembleMotifFragmentJigsaw` keeps each compound's internal contours and arrangement, places pieces using uniform fit/reference reflection, enforces bouquet/branch/border roles and rejects overlapping piece footprints or out-of-canvas contours. Sixteen-sample foreground/colour edge signatures provide a soft border-neighbour mismatch score; repeated identical neighbouring pieces are penalized. Seeded tie-breaking varies piece choice and orientation. The default 250 × 80 canvas uses 25 pieces: five main compounds and twenty border pieces.

The assembler reuses MotifGraph/provenance, transforms and reconstruction. Reconstruction now builds its node lookup once per batch rather than once per contour point; the existing single-point API is preserved. It exports pure SVG paths with even/odd colour-layer fills and no embedded photos. The library is loaded as a separate JSON asset, with loading/error state; source images and the authored grammar remain accessible separately.

## How other systems work

Examined directly on 2026-10-13:

- [Efros and Freeman, Image Quilting (SIGGRAPH 2001)](https://people.eecs.berkeley.edu/~efros/research/quilting.html): synthesizes appearance by stitching together patches of existing images. The paper's overlap/seam optimization is not implemented here.
- [WaveFunctionCollapse official README](https://github.com/mxgmn/WaveFunctionCollapse): extracts observed local patterns and propagates compatibility constraints during synthesis. This increment implements source-fragment role constraints and a greedy soft edge score, not WFC entropy selection, constraint propagation or backtracking.
- Existing `scripts/train/lego.ts` already measures nearest-brick/novel-element classifications, neighbouring offsets, mirrors and repeats. That analyzer's shape statistics do not by themselves preserve the source contours. This increment supplies actual contour-bearing pieces for assembly without claiming new training.

## Scope and limitations

Original creator and source/permission evidence remain attached to every fragment. Retained permissions are reference-use assessments of historic public-domain declarations, not a fresh worldwide commercial-licence determination. No regional, botanical or symbolic identities are invented. Arabic and other traditions are not merged into this Ukrainian library.

Extraction is intentionally reviewable and limited to six crop windows: it is not automatic motif discovery across the entire corpus. Source sampling and thresholding discard some colour/detail, may retain scan speckles, and crop boundaries can cut branches. No independent expert segmentation score is available.

Border edge scoring is approximate. Gaps between fitted pieces remain; exact continuous vine/stem joins, quilting seam cuts, WFC search and semantic piece-level connections are incomplete. Footprint safety is separate from intentional adjacent colour boundaries inside a source piece; no manufacturing clearance or thread-density assertion is made.

No training, active learned generator, canonical geometry change, stitch count, stitch-file export, sew-out approval or deployment is claimed. Physical calibration is null and production approval is false. The next refinement is reviewed smaller motif pieces with explicit connection ports and continuous border matching, followed by digitization.

## Verification

- Engine typecheck and build passed; all 53 engine test files / 189 tests passed, including the 18 machine-feasibility regression tests.
- New tests verify exact preservation of selected source paths, original library/canonical immutability, deterministic arrangement, changed seed, footprint/envelope results, SVG hole handling, permission rejection, missing roles and out-of-frame geometry.
- Extraction checks exact mask roundtrip before and after colour-layer graph compaction: six fragments, thirty colour layers. No model training performed.
- Two benchmark seeds produce 25 pieces each with zero footprint overlaps and zero outside-envelope contour objects; vectors, PNGs, source crop images, library hash and placement reports retained.
- Web TypeScript/Vite build passed. Fragment JSON is a separate 1.198 MB asset (178.77 KB gzip); the existing large-JavaScript-bundle warning remains.
- Playwright exercised the built app via Vite preview: jigsaw default, source JSON loaded, no images embedded inside generated SVG, seed changes, dimensions applied, SVG download, authored mode retained, no page errors and no overflow at 390px. Browser evidence is in the benchmark directory.
- Existing pilot completed with 12 candidates and no execution errors. Its reference manifest still blocks production for absent machine selection and unvalidated reference patterns. This pilot does not establish manufacturing of the new jigsaw.
