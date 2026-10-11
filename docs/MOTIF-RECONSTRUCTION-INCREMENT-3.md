# Raster reference baseline

The development increment shares the existing deterministic FFT, band/symmetry analysis and connected-component utilities with the Tesseract package. Original corpus/train import paths remain compatibility entrypoints. No training job or new generator was introduced.

`decomposeMotifMask` accepts a binary mask, explicit original-image provenance and reference width. It creates composition / region / connected-component assembly / row-run element nodes in the typed MotifGraph. Runs preserve holes, disconnected pixels and all selected foreground pixels. `reconstructMotifMask` provides a strict decoder for this baseline only. This is pixel preservation, not semantic historical decomposition or a machine stitch plan. Dimensions are reference normalization, not physical calibration. Existing canonical ASCEND geometry and production approval blockers remain unchanged.

Run the historical-image benchmark with:

```
./node_modules/.bin/tsx scripts/benchmark-motif-raster.ts IMAGE PROVENANCE_JSON OUTPUT_DIRECTORY
```

The runner validates the original image SHA-256 against the supplied provenance, resizes inside 256 pixels and uses an explicitly documented grayscale threshold baseline. It saves graph/analysis, threshold and reconstructed images and a report. Permission must be established by the caller; the schema check cannot independently establish a licence.

A local run used Met object 445264, Textile Fragment, attributed to Bursa, Turkey, 16th century (Ottoman); the museum API reports isPublicDomain=true under its Open Access CC0 policy. The acquired web-large image hash and exact metrics are in `benchmarks/motif-raster-met-445264.json`. The threshold raster was 92 x 256, with 6,921 foreground pixels and 234 components; graph reconstruction preserved that mask exactly (IoU 1, RMSE 0). This does **not** establish correct ornament segmentation: the threshold mixes ground, outlines and photographic artefacts. The downloaded source/metadata remain in the local review workspace; the benchmark is an explicit-input CLI, not an offline historical fixture or CI reproduction of that photograph.

Visual observations: scalloped medallions alternate along the fabric, branching stems connect floral units, and small floral connectors occupy the intervening field. These observations are not yet graph annotations. The source is not labelled Arabic or Ukrainian. The attached sash paper also contains Lithuanian examples alongside Ukrainian ones; use figure captions and object identifiers, never the paper title alone, for attribution.

Remaining: caption-linked Ukrainian reference crops; reviewed foreground masks and perspective rectification; separately annotated stems, petals, connectors, holes and repeat units; comparison against independent annotations; semantic junction/nesting recovery; physical calibration and stitch planning. No model training or production approval is claimed.
