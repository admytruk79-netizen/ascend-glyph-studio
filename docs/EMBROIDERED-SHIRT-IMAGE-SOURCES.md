# High-resolution embroidered shirt sources — 2026-10-13

## Ukrainian shirts: verified reference image

[V&A Ukrainian wedding shirt and apron, T.7&A-1964](https://collections.vam.ac.uk/item/O364307/)
has a **1,519 × 2,500 pixel** primary image. The full-size image was downloaded
and visually examined. The catalogue describes sleeve diamonds and floral
forms, red/black satin and cross stitches, neck/cuff bands and bobbin lace.

- [Full-size shirt image](https://framemark.vam.ac.uk/collections/2019MB5185/full/full/0/default.jpg)
- [Image dimensions and IIIF service](https://framemark.vam.ac.uk/collections/2019MB5185/info.json)
- [Object manifest with additional views](https://iiif.vam.ac.uk/collections/O364307/manifest.json)
- [Actual linked V&A terms](https://www.vam.ac.uk/info/va-websites-terms-conditions)

The manifest attributes images to © Victoria and Albert Museum, London and
links those terms, not CC0. Terms permit storing the majority of content for
personal/private use; no open licence supporting this engine training was
established. This image was studied locally and excluded from the fit and repo
image redistribution. Machine-stitched garment seams in the catalogue are not
proof that its embroidery is machine embroidery.

[V&A Ukrainian child's jacket and apron, T.70-1951](https://collections.vam.ac.uk/item/O364308/)
has a **2,500 × 2,292 pixel** primary image service, verified through its
[IIIF info](https://framemark.vam.ac.uk/collections/2019MD9521/info.json).
Its image reuse remains under the V&A terms.

[Honchar clothing](https://honchar.org.ua/collections/view/odag) and
[embroidery/cut charts](https://honchar.org.ua/to-learn), and
[Krovets](https://krovets.ua/) provide additional Ukrainian reference material.
Their chart or preview restrictions remain in effect; subscriber access is not
a training licence. A complete freely licensed high-resolution Ukrainian shirt
training set has **not** been established.

## Downloaded CC0 shirt/blouse images

These four images were downloaded from Cleveland's print-image URLs, visually
reviewed and checked against actual pixel dimensions. Each retained official
object API record explicitly marks `share_license_status=CC0`; see the museum's
[Open Access policy](https://www.clevelandart.org/open-access).

| Object and catalogue culture | Pixels | Direct image |
| --- | --- | --- |
| [Shirt, Gujarat/Kachchh, India, 1926.490](https://clevelandart.org/art/1926.490) | 1,666 × 3,400 | [Print JPEG](https://openaccess-cdn.clevelandart.org/1926.490/1926.490_print.jpg) |
| [Blouse, Spain, 1919.729](https://clevelandart.org/art/1919.729) | 3,400 × 1,195 | [Print JPEG](https://openaccess-cdn.clevelandart.org/1919.729/1919.729_print.jpg) |
| [Peasant Blouse, Hardanger, Norway, 1924.629](https://clevelandart.org/art/1924.629) | 3,400 × 1,191 | [Print JPEG](https://openaccess-cdn.clevelandart.org/1924.629/1924.629_print.jpg) |
| [Blouse front, Philippines, 1955.419](https://clevelandart.org/art/1955.419) | 3,400 × 1,741 | [Print JPEG](https://openaccess-cdn.clevelandart.org/1955.419/1955.419_print.jpg) |

The Gujarati reference is photographed flat around a central neck opening, not
a complete dressed figure. The Spanish blouse provides neckline, shoulder,
sleeve and cuff placement. The Norwegian blouse shows collar/placket and cuff
ornament. The Philippine front supplies low-contrast white embroidery and
drawnwork; its background and opening must not be treated as embroidery.
These are separately attributed construction references, not Ukrainian shirts.

Full-resolution TIFF URLs are recorded in
`data/research/shirt-image-sources/review.json` but those files were not downloaded.
Avoid screenshots: original or print images and separate front/back/sleeve/cuff
views retain more useful detail. Sharp focus and visible thread/fabric are more
valuable for stitch analysis than resolution alone. These images still lack a
documented fabric-grid calibration or independently annotated stitches.

## Actual training performed

`npm run train:patterns:sequence` now uses manifest v3. Four new admitted shirt
images are appended to the previous eleven-source sequence; all earlier sources
are replayed at each cumulative fit. The final statistical candidate has eight
k-means centres, **15 images, 14 source groups and 300 component/fragment
descriptors**. The two Ukrainian 1902 plates stay in one holdout book group.
All fourteen group folds have lower raw descriptor distance than a single-mean
baseline, which is not semantic, cultural or aesthetic validation.

The added shirt contributions are 5 Gujarati whole-image components, 2 Spanish
components, 28 Norwegian tile fragments and 23 Philippine components. These
counts describe extractor output, not labelled motifs. Whole-garment background,
fabric and disconnected fragments can influence them. The fitter resizes images
to at most 512 pixels before extraction; high-resolution originals are retained
for subsequent motif-region annotation, not represented as full-resolution
stitch learning. No raw-image neural segmentation or garment/stitch model was
trained. No V&A image entered training.

Candidate weights and full evaluation are retained in
`data/research/training/runs/pattern-sequence-v3/`; four print images, their
SHA-256 hashes and museum metadata are retained in
`data/research/shirt-image-sources/`. Verified: fitting under Node 22, identical
report on repetition, nine training regression tests and actual downloaded
image dimensions. No canonical geometry, manufacturing constraints or Neon
records were changed. No production approval or remote CI success is claimed.

Next: crop and annotate actual shoulder/collar/cuff motifs at source resolution,
keep all views/crops of one garment together in holdout groups, and add those
validated structures to the reconstruction and relationship benchmarks.
