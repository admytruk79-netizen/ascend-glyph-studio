# Increment 27 — detailed motif parts and explicit connections

Branch: `codex/motif-graph-reconstruction`. State: REFERENCE.

## Implemented

The new library contains nine individual flower heads, two leaves and two scrolling border segments from the retained Samokysh Ukrainian ornament plates 27 and 37 (1902). These replace whole bouquets as the construction units in this path. The studio defaults to `Detailed source motifs`; the statistical learned composer, older whole-fragment arranger and canonical studies remain available separately.

`motif:parts:extract` verifies original image hashes and retained reference-use permissions, then applies explicit crop windows, ellipse masks for flower/leaf isolation and a narrow polygon mask for the veined leaf. Each crop is resized to 144 pixels wide. Documented draft RGB paper separation and five-colour quantization retain contour detail and holes. Existing mask-boundary extraction and polygon rasterization verify exact binary-mask roundtrip before and after graph compaction for all 65 colour layers. This measures the selected masks, not expert semantic accuracy or original-colour fidelity.

The boundary-port selector finds points adjacent to the largest connected foreground component. Each part records base/left/right ports with their owning colour layers, avoiding disconnected speckles as attachment targets. Role labels and crop boundaries are explicit visual study annotations, not trained botanical classification.

`composeDetailedMotifParts` preserves the original part coordinates under uniform fit, rotation and optional reference-only reflection. A seeded shuffle cycles the flower catalogue so the first main/side flowers cover all nine heads. It assembles branching units with a central flower, two smaller flowers, four leaves and new authored stems/branches. A shared carrier connects the units. Two scrolling border rows join their actual boundary ports; two rows of small source flower heads provide finer framing detail. Border repeat count fits the source aspect and available canvas rather than stretching its shapes.

Existing Tesseract graph/provenance/transform/reconstruction components remain in use. Every junction names actual ports. The composer rejects off-path library ports, non-normalized source transforms, malformed/open source contours, unverified source permissions, leaves whose conservative transformed crop boxes intersect flower crop boxes, broken declared junctions and out-of-envelope contours. This does not certify all inter-part path intersections or thread clearance.

SVG export uses self-contained vector definitions and transformed instances, retaining colour-layer even/odd hole filling. It embeds source URLs, creators, cultural contexts and permission evidence in metadata; no source photograph is embedded. This reduced the example SVG from roughly 9.6 MB to 1 MB. An independent raster comparison against the earlier fully expanded vector export at 1800px width measured normalized RGB RMSE 0.000265 (rounding/antialiasing difference, not a semantic reconstruction score). Complete graphs are retained as gzip-compressed JSON to avoid repeating large uncompressed coordinate arrays in the repository.

## Evidence

- Both retained benchmark seeds at 250 × 80 mm / density 0.8 have 72 placed parts and 92 declared junctions, zero broken junctions, no independently placed leaf/flower box overlaps and no outside-envelope contour objects.
- All nine flower-head variants occur among the main and side flowers, rather than selecting only a few examples.
- Regression tests verify unchanged source paths and library data, deterministic regeneration, seed variation, unchanged canonical registry, retained holes, null stitch count, false production approval, source-permission rejection and invalid-port/source-transform rejection.
- Tesseract typecheck/build passed. Full suite: 54 files / 192 tests passed. After export compaction, border-density and source-transform guards, the three new composition tests were rerun successfully.
- Web TypeScript/Vite build passed. The existing large JavaScript bundle warning remains; the motif-part library is fetched as a separate JSON asset.
- Playwright against the built app confirmed the detailed default, changing source-part selection, vector SVG download, density control, retained learned mode, no page errors and no overflow at 390px. Browser evidence is retained with the benchmark.

## Limits

These are newly arranged, attributed historical reference shapes. The stems, branching layout and border bridges are authored; they are not recovered historical grammar. Crop masks and colour segmentation are draft and can cut contour details or retain scan artefacts. Source-part names do not establish botanical species, regional identity or symbolic meanings. Existing per-item historical reference-use assessments are retained; no fresh worldwide commercial-rights determination is claimed.

Leaf/flower protection applies to independently placed parts. It does not reinterpret intentional layering already present inside a historical source illustration. Bounding boxes are conservative and do not certify every connector interaction. Internal colours are retained together, but a full petal/core/nesting/attachment graph remains incomplete.

This increment covers the floral/leaf/border library, not all animal, geometric or regional embroidery families. It does not apply or retrain the stored statistical grammar in this mode; that earlier mode remains separately usable. No neural training, production deployment, physical calibration or factory approval occurred.

These detail-preserving multi-contour colour masks still require hole-aware digitization, removal or treatment of sub-thread-size details, selected-machine/material checks and physical sew-out. Stitch count remains null in this mode; the earlier learned/authored vocabulary mode retains its calculated prototype stitch counts. No machine file is released from the new detailed mode.
