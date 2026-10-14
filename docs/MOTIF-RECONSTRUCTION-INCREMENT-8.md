# Wider floral reference set

A second public-domain source, Met Brocade 445265, is now retained with its museum metadata, original photograph and hash-identified provenance. It is an Ottoman textile attributed to Bursa, Turkey, 16th century. Museum metadata explicitly reports `isPublicDomain=true` under the Met Open Access CC0 evidence. No Ukrainian, Arabic or English attribution is added to this source.

Four source regions were visually inspected and committed as draft crop annotations: an elongated gold-coloured flower head, a small rosette cluster, a striped bud-like unit, and a curved serrated supporting leaf. The leaf is not counted as another flower family. These visual descriptions do not establish a botanical identification or a cultural motif taxonomy. Alongside the existing Met 445264 connector, this broadens actual retained source imagery beyond one floral structure.

`npm run benchmark:floral` loads the retained original, verifies its hash and source dimensions, crops each recorded region, resizes within 192 pixels and applies the existing explicit red-ground colour rule. It reuses the existing component/contour decomposition and independent even/odd rasterization. Each region emits a graph and source crop; a gallery compares the source with its contour mask. All four masks reconstruct with zero pixel errors. This establishes representation fidelity, not expert segmentation accuracy.

Texture creates many tiny holes and fragments, particularly in the gold-coloured flower head. Rectangular crops also include neighbouring ornaments. These artefacts remain visible; no cleanup, semantic petal extraction or correct leaf/flower separation is claimed. These graphs are reference material, not novel designs or machine stitch patterns.

The historical benchmark command now includes the floral-variety runner, and the workflow path filters include its script. Remote workflow execution has not been verified for this increment. The committed benchmark report is `docs/benchmarks/floral-variety-met-445265.json`.

The English Lancaster Prints 1856 museum record (AIC 9415) was also checked and reports public-domain status, but its image fetch returned HTTP 403; no image or verified reconstruction fixture was added for it. The Ukrainian sash candidates remain caption-reviewed research entries with reconstruction permissions unverified.

Next: reviewed masks separating the flower heads, rosette units, buds and supporting leaves; texture-aware contour cleanup that retains real holes; internal parts and attachment constraints; repeat grammar; independent cultural and visual review; machine digitization after physical calibration. No model training or production approval is claimed.

Local verification passed: `npm test --workspace=@ascend/tesseract-engine` (145 tests) and `npm run benchmark:motif:historical` (five benchmark runners including the new floral set). Engine implementation and manufacturing code were unchanged in this increment; the changes add source fixtures, benchmark integration and documentation.
