# Tesseract Ukrainian corpus recovery and fragment gate — 2026-11-04

## Verified live inventory (read-only Neon queries, project `spring-mode-77399290`)

The corpus is **not missing**. On 2026-11-04, SQL counts showed:

| Relation | Rows |
| --- | ---: |
| `research_corpus_object` | 98,074 |
| `research_corpus_analysis` | 84,275 |
| `research_image_tag` | 34,621 |
| `corpus_canonical` | 24 |

Filtering `research_corpus_object.tradition ILIKE '%ukrain%'` and joining analysis on object ID returned **7,844 Ukrainian-attributed records**, of which **4,247** had analysis rows: **3,071 train**, **519 validation**, **657 holdout**; **4,246** had non-null deconstruction. Within the Ukrainian training set with deconstruction, `kind` counts were **1,750 single**, **874 field**, **428 frieze**, **18 mixed**. The remaining training record had no deconstruction.

These are database inventory counts, **not** a count of individually rights-reviewed Ukrainian embroidery photographs, authentic ethnographic attributions, production patterns, or manufacturer-validated samples. The label `cultural_access='open'` and a descriptive rights string are **not** the independent `rightsStatus='approved'` and `culturalReview='approved'` gates required for synthesis. Image analysis is not proof that the source is an embroidered textile rather than a book page, chart, photograph, or other image. Validate source attribution and object-family duplicates before selecting training examples.

## Existing code to reuse

- `scripts/corpus/deconstruct.ts`: raster band/repeat/frieze/wallpaper and scale decomposition.
- `packages/tesseract-engine/src/embroidery-image-analysis.ts`: bounded pixel analyzer.
- `packages/tesseract-engine/src/reviewed-image-pipeline.ts`: approved-reference pixel-to-structural analysis.
- `packages/tesseract-engine/src/reference-structural-rules.ts`: independent-source, SHA-256 and object-family evidence gates.
- `scripts/analyze-reviewed-embroidery.ts`: local reviewed-image decoder and NDJSON output.
- `packages/tesseract-engine/src/reviewed-fragment-compiler.ts`: split-safe, tradition-isolated compilation of approved structural rules.
- `scripts/corpus/compile-reviewed-fragments.ts`: compile reviewed NDJSON to an optional Tesseract `fragmentLibrary` input.
- `packages/glyph-registry/data/fragments.v1.json`: 32 user-source ASCEND fragment reconstructions; all remain pending structural review and are **not** automatically promoted to canonical geometry.
- The `tesseract-staging` branch has additional Ukrainian band/botanical generators and a Neon export script. Treat staging assets as prototypes and reconcile rather than duplicate them.

## Reproducible offline path

1. Independently verify source objects and their rights, cultural context and exact attribution; assign each approved image a `traditionId`, object family, unique source, and `split` (`train`, `validation`, `holdout`). Do not infer approval from a URL or catalog rights label.
2. Place approved images locally and run `npm run embroidery:analyze` with `CORPUS_IN` and `IMAGE_ROOT`. The output now carries the explicit `traditionId` and `split` supplied by the reviewer.
3. Run `npx tsx scripts/corpus/compile-reviewed-fragments.ts`. Missing labels, invalid schema, restricted/unreviewed references and validation/holdout entries cannot become training fragments. The compiler requires at least two independent approved objects for each structural operation *within a tradition*.
4. Pass the resulting approved library to `runTesseractBatch({fragmentLibrary: ...})` and compare fixed-seed runs with/without the library. Source IDs are recorded in candidate trace. Never transplant historical contours into ASCEND glyph geometry.
5. Run `FRAGMENT_TRADITION=ukrainian-ornament npx tsx scripts/benchmark-reviewed-fragments.ts` to produce `baseline-specimens.svg`, `fragment-specimens.svg`, and `comparison.json` from the actual batch engine with identical seeds and search settings. The benchmark refuses an empty or unreviewed fragment library; no fixture is silently substituted.\n6. Inspect actual SVGs for sophistication, originality, cultural appropriateness and construction feasibility. Maintain `structural-reference-only` status until evidence and physical tests justify promotion.

## Current limitations

No source images were fetched, no database rows were modified, and no new records were automatically approved in this change. No visual superiority or machine validation is claimed. The next milestone is a measured, source-reviewed Ukrainian pilot and an A/B render benchmark. The production engine POA's garment, stitch, machine and physical-sample gates remain in force.
