# Museum source expansion — 2026-10-13

Executed the existing Tesseract cumulative shape fitter on all eleven admitted
images, in manifest order. This extends the five previous sources with six
reviewed Cleveland CC0 embroidery objects: birds, German whitework, Moroccan
sampler, Chamba narrative figures/animals, Chinese cloud-collar ornament and a
Palestinian blouse front. Their individual cultural attribution remains in
`data/research/museum-embroidery-sources/review.json`. V&A and Honchar images are
not included in this training manifest.

Each stage refits all preceding admitted descriptors; none of the initial five
sources is dropped. The final candidate contains eight fitted k-means centres,
from 242 correlated component/fragment descriptors, eleven images and ten source
groups. The two Ukrainian plates remain in the same book group for evaluation.
All ten object-group holdouts have lower descriptor distance than a single-mean
baseline. This is evidence of shape clustering, not cultural, semantic or
aesthetic generalisation. No relationship model was retrained in this increment.

| Added source | Descriptors | Extraction |
| --- | ---: | --- |
| Chinese birds, Cleveland 157565 | 93 | 4×4 tile fragments |
| German altar cloth, Cleveland 126139 | 4 | Whole-image components |
| Moroccan sampler, Cleveland 111325 | 3 | Whole-image components |
| Chamba narrative rumal, Cleveland 159635 | 40 | Whole-image components |
| Chinese cloud collar, Cleveland 156897 | 19 | Whole-image components |
| Palestinian blouse front, Cleveland 117038 | 36 | 4×4 tile fragments |

Pixel components are not expert-labelled motifs. Bird fragments can include
woven ground; the low count of whitework components does not establish reliable
whitework segmentation. Dense sampler connectivity likewise prevents interpreting
three components as three complete historical motifs. No animal anatomy, figure
articulation, stitch recognition or garment-placement model was trained.

`npm run train:patterns:sequence` now defaults to manifest v2 and emits candidate
weights and evaluation under `artifacts/motif-reconstruction/pattern-sequence-v2`.
The existing GitHub workflow invokes that command. Versioned weights/reports are
retained in `data/research/training/runs/pattern-sequence-v2/`; the earlier run
remains intact. Reports now include source URLs, permissions, actual group count
and training-code hashes, replacing the previously hard-coded four-group text.

Verified: actual fit under Node 22; a repeated run produced an identical complete
report; nine training regression tests passed. No engine geometry changed, so
the engine build/test results from increment 17 were not rerun or represented
as new checks. No Neon write, foundation-model fine-tune, candidate promotion,
new stitch count, physical calibration or production approval occurred.

Next work is manual source-region annotation, beginning with separate bird
silhouettes and woven background, and the Palestinian garment's placket, bands
and lower geometric field. Those annotations must precede semantic or relational
training on these objects.
