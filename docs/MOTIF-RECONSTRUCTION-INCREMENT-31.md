# Increment 31: source-guided vines and Neon descriptor intake

Implemented on `codex/motif-graph-reconstruction`.

## Actual data and training

Read-only Neon census: 80,073 catalogue image references, 71,219 analyses, 70,936 nonempty deconstruction records. Stored deconstruction mainly describes crops/repeats, not editable semantic anatomy. Some catalogue tradition labels conflict with explicit Palestinian titles; intake labels are not authenticated cultural attribution.

Downloaded 75 bounded candidates with content hashes and fetch receipts. Trained the existing sequential pattern codebook on 53 admitted references in 14 source groups: 604 descriptors, eight centroids. All 14 source-group diagnostic holdouts improved descriptor error over the single-mean baseline. This is descriptor clustering, not neural image training, aesthetic validation or semantic reconstruction. Modern candidate photographs were excluded from training.

A candidate similarity selector now influences runtime motif ordering. Alpha-composited source crops are flattened onto a light background before descriptor extraction. The report hash binds the selector to the actual training run.

## Reconstruction and product integration

Added typed, provenance-bearing manual construction studies for Samokysh plates 31 and 37 (1902). Plate 31 supplies 15 head envelopes, 13 spine vertices and 20 candidate leaf targets. Macro reconstruction retains relationship checks and a deliberately broken-contact negative control. It does not reconstruct the complete source artwork.

Extracted library v2 has 24 source parts and 120 colour layers, including fan, cup, hanging and satellite roles. Raw extraction has exact mask roundtrips. Runtime contour cleanup, silhouette backing and recolouring explicitly change source geometry and are attributed interpretations. Canonical ASCEND primitives remain unchanged.

The development studio defaults to a source-guided flowing vine. It supports seeded variation, scale/foliage control, SVG export, exact project restoration and a source/macro/output comparison. Legacy modes remain available. Leaf boxes are checked against flower boxes, reduced or omitted rather than overlaid. This is a bounding-box clearance check, not complete stitch collision analysis.

## Verification

55 engine test files / 197 tests pass. Engine typecheck and web TypeScript/Vite production build pass; existing bundle-size warning remains. Three benchmark seeds produce 51–52 parts, 110–113 connected junctions, zero broken junctions, zero leaf/flower box overlaps and zero out-of-envelope parts. Five or six candidate leaves are explicitly omitted per seed. Browser verification covers variation, SVG download, project roundtrip, comparison study, retained stitch mode and mobile overflow.

No independent image-accuracy score, artistic-quality approval, new stitch count, machine file or physical sew-out approval is claimed. New vine output remains a reference SVG requiring digitization. Source crop quality and anatomical reconstruction remain incomplete.

## Reproduction

- `python scripts/fetch-neon-source-intake.py`
- `npx tsx scripts/train/train-pattern-sequence.ts data/research/neon-source-intake/training-manifest.json data/research/neon-source-intake/training-run`
- `npx tsx scripts/extract-motif-parts.ts data/research/motif-parts-v2 data/research/neon-source-intake/extra-motif-crops.json`
- `npx tsx scripts/fit-neon-motif-selection.ts data/research/motif-parts-v2/library.json`
- `npx tsx scripts/benchmark-source-vine.ts`

The 25 MB intake image cache is ignored; source manifests and fetch receipts are tracked. Runtime-used plate 31 and extracted part images are retained in the repository.
