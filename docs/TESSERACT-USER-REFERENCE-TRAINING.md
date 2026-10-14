# Training from the five supplied screenshots — 2026-10-13

Executed a bounded local statistical fit using the user's explicit instruction:
“Use these to train engine.” This authorizes the local study; it does not claim
ownership, an original-image licence or a public-domain museum attribution.
The screenshot images and generated thumbnail crops are not redistributed in
the repository. Source hashes, crop coordinates and experimental weights are
retained for reproducibility.

## What was used

All five 591×1280 screenshots were verified against their SHA-256 hashes and
dimensions. Nine manually selected crops focus on embroidery: framed towel
bands, an angular/openwork border, dark floral fields, sleeve diamond grids,
star/tree bands, floral sleeves, red diamond bands, a neck panel and an angular
bird-like field. Visible phone UI and captions were excluded; one crop was
shortened after visual review to remove a small caption strip. Some crops retain
garment fabric and image background, which can affect extracted descriptors.

The approaches in the manifest are manual observational tags, not established
motif identities, region labels or independent semantic ground truth. Search
result publisher names do not establish the creator or rights of the original
photograph. Repeated thumbnail designs across screenshots were avoided where
visually identifiable, but unidentified duplicates remain possible.

## Actual fitting

`npm run train:references:user` verifies the study manifest, source bytes and
image dimensions, crops the supplied images, and reuses the existing Tesseract
`learnImage`, `featureOf` and deterministic `kmeans` components. A bounded tile
fragment fallback handles large connected components. Each stage refits the
cumulative dataset, replaying all fifteen previously admitted museum/reference
images and the preceding screenshot crops.

The final fit contains **346 correlated shape descriptors**: 300 replayed
museum descriptors and 46 descriptors from the nine user crops. Eight k-means
centres are fitted. The five screenshots are one discovery-session group,
giving fifteen total groups with the museum groups included. This is not a
count of independent historical sources. No screenshot holdout accuracy is
reported: original source identities are unresolved and the screenshots share
motifs. A training result is not a generalisation claim.

This is a shape-codebook fit, not neural fine-tuning, stitch extraction or a
trained band/border hierarchy model. Observational tags are recorded but not
used as learned cultural/semantic labels. No current studio-generation or live
model promotion was performed. Canonical ASCEND geometry, manufacturing gates
and Neon records remain unchanged. Stitch count and production approval are
unset.

## Retained evidence and rerun

- `data/research/training/user-reference-study-v1.json`: bounded authorization,
  source hashes, image dimensions, selected crop rectangles and review limits.
- `data/research/training/runs/user-reference-study-v1/`: candidate model and
  complete report, including each cumulative stage, extraction modes and code
  fingerprints.
- `scripts/train/train-user-reference-study.ts`: actual fitting command.

The command ran under Node 22. Repeating it produced an identical complete
report. Eleven training tests passed, including rejection of missing study
authorization, unknown sources, duplicate crop IDs and out-of-image crops.
Museum replay still contributed exactly the previous 300 descriptors.

For a later rerun, the original five uploaded JPEGs must be available at the
manifest paths, or set `USER_REFERENCE_IMAGE_DIR` to a directory containing
their original filenames. Hash checks still apply. The screenshot experiment
is local; CI cannot rerun it without those files. Existing museum training CI
is unaffected.

Next is explicit, reviewed construction annotation of the selected geometric
and floral fields and a generator integration that can use those rules. The
current codebook does not establish that capability, and the screenshots are
too coarse to support exact stitch counts or fabrication files.
