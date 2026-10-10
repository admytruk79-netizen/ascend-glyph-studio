# Tesseract Visual Generative Architecture v1

## Decision
Tesseract becomes a **visual generative system + deterministic textile compiler**. The existing graph/vector generator remains useful for constraints, provenance, glyph semantics and manufacturing, but it is no longer the primary aesthetic generator.

## Pipeline
1. **Rights-cleared visual corpus** — full images plus crops/segments, not only metadata graphs.
2. **Visual representation** — image embeddings + multiscale latent features + segmentation/depth/material channels.
3. **Three tradition adapters** — Ukrainian, Arabic/Islamic, and specific documented Indigenous North American textile traditions. Never train a generic pan-Indigenous style label.
4. **ASCEND identity adapter** — trained/conditioned on canonical ASCEND glyph assets and approved ASCEND work. It controls identity; cultural adapters contribute compositional grammar rather than copied motifs.
5. **Fusion generator** — latent/image diffusion generates high-detail raster candidates at several scales. Inputs include ASCEND glyph masks, tradition weights, symmetry/repeat topology, palette, intended textile and physical size.
6. **Novelty/provenance gate** — reject near-neighbours of corpus images using image and crop embeddings; store nearest-source distances and adapter weights.
7. **Material/depth decomposition** — output albedo/color, height/depth, thread/warp direction, region masks and repeat tile boundaries.
8. **Textile compiler**:
   - embroidery: segment -> centerlines/regions -> run/satin/fill -> underlay/density/pull compensation -> stitch IR -> machine exporter;
   - weaving: quantize palette -> warp/weft/interlacement grid -> float/sett/yarn constraints -> loom draft;
   - print: high-resolution repeat tile + color profile;
   - 3D preview: height/normal/roughness maps applied to fabric/garment geometry.
9. **Manufacturing critic** — reject candidates that cannot survive minimum feature, stitch density, float length, repeat seam or material constraints.

## What Neon stores
Neon is the catalogue/control plane, not the renderer: source provenance/rights; image/crop URIs; embeddings; motif annotations; regional/tradition labels; adapter/model versions; generation recipes/seeds; ASCEND glyph IDs; novelty scores; material profiles; manufacturing validations; output asset URIs.

## Visual model interface
The engine should depend on a provider-neutral interface rather than hard-code one model:
- generate(request) -> candidate assets
- embed(image) -> embedding
- segment(image) -> semantic/material masks
- estimateDepth(image) -> depth/height guidance

This permits a local/open model, hosted GPU endpoint, or future model without rewriting the textile compiler.

## Three alphabets
Build three research alphabets, each initially 26 **compound motif families**, as visual/compositional families rather than literal Latin-letter drawings:
- UA-A..Z
- AR-A..Z
- INA-A..Z, with each family carrying a specific community/tradition provenance label rather than generic "Native American".

These 78 families are ingredients. Final ASCEND patterns are generated from ASCEND glyph identity + selected families + learned visual grammar, then novelty-filtered. They are not copies or claims of traditional authenticity.

## Acceptance gate
A candidate is not promoted merely because it is valid SVG. Promotion requires: visual complexity target; no close corpus match; coherent hierarchy at macro/meso/micro scales; seamless repeat where requested; physical-size metadata; manufacturing validation for intended medium; and material preview assets.
