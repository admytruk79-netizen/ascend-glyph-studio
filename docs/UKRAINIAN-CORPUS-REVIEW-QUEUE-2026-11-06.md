# Ukrainian corpus provenance triage — 2026-11-06

## Finding: broad search attribution is not cultural evidence

A read-only Neon inspection of `research_corpus_object` joined to `research_corpus_analysis` (project `spring-mode-77399290`) found **3,070** Ukrainian-attributed, train-split records with non-null deconstruction: **2,004 Commons**, **1,061 Internet Archive**, **4 AIC**, **1 LOC**. The earlier 3,071 train count included one record without deconstruction.

This search cohort is **not** a validated Ukrainian embroidery corpus. For example, records labeled by the database as Ukrainian include:
- `commons-107872780` — “Embroidery in the Erzyan village - Kende vele 01”
- `commons-107872781` — “Embroidery in the Erzyan village - Kende vele 02”
- `commons-119865113` — “Embroidered Virgin of Guadalupe”
- `commons-10347285` — “HudsonEmbroideryCollage”

These are **title-level review flags**, not final authenticity determinations. The source labels demonstrate that broad search retrieval must not be promoted to verified tradition evidence. A title mentioning embroidery does not establish Ukrainian attribution, nor does a Commons license label establish all necessary rights/cultural permissions.

## Non-admitting review queue

`scripts/corpus/prepare-ukrainian-review-queue.mjs` consumes a local metadata NDJSON export. It produces a **review-only** JSON queue, never an approved fragment library or training input. Each record remains pending for independent attribution, rights, cultural, image-subject and source-family/hash review. Validation/holdout records are rejected from this train-only queue; duplicate IDs are rejected, repeated source/image URLs flagged. Missing source evidence is flagged, not silently accepted.

Use a **read-only** query, exporting each `row_to_json` result as one NDJSON line with your existing authorized Postgres client:

```sql
SELECT row_to_json(t)::text
FROM (
  SELECT o.id, o.source_key, o.tradition, a.split,
         o.title, o.rights, o.cultural_access,
         o.source_url, o.image_url, a.kind
  FROM research_corpus_object o
  JOIN research_corpus_analysis a ON a.id = o.id
  WHERE o.tradition ILIKE '%ukrain%'
    AND a.split = 'train'
    AND a.deconstruction IS NOT NULL
  ORDER BY o.source_key, o.id
) t;
```

Save the returned JSON values to `data/research/ukrainian-metadata.ndjson` (one JSON object per line). Then:

```sh
CORPUS_REVIEW_IN=data/research/ukrainian-metadata.ndjson \
CORPUS_REVIEW_OUT=data/research/ukrainian-review-queue.json \
node scripts/corpus/prepare-ukrainian-review-queue.mjs

node --test test/prepare-ukrainian-review-queue.test.mjs
```

The queue is **not** directly compatible with the fragment compiler: that is deliberate. After a human independently checks the primary source, licenses/permissions, cultural context, object-family duplication, image content, and train/validation separation, approved image files must still be supplied to the existing reviewed-image pipeline. Do not copy the catalog's `open` or `Public domain` labels into `rightsStatus:'approved'` or `culturalReview:'approved'` without the underlying review evidence.

## Verification and blockers

The queue script and five built-in Node regression tests were executed locally on 2026-11-06 and passed before GitHub publication. The PR branch includes a `test:review-queue` script and appends it to `verify:tesseract-worker`. **GitHub CI on the new branch head is not yet claimed passed** until run status is inspected. No actual source images were fetched, no reviewer approvals assigned, no database rows changed, no A/B fragment benchmark produced, and no manufacturer or physical sew-out validated.

Next: export a small, diverse source-metadata pilot, manually inspect primary-source evidence, approve only independently documented train-split records, and then run the existing fragment benchmark. Maintain immutable ASCEND canonical geometry and reference-only manufacturing status.

## 2026-11-07 independent-source hardening

Read-only Neon recheck of the same train/deconstruction cohort returned **3,070** records. A deliberately narrow title scan for `Bangladesh|Kyrgyz|Erzyan|Guadalupe|AIR FRANCE|keyring` flagged **13** records for review; this is a *triage count*, not a count of confirmed misattributions or a measured corpus error rate. A small source-key-ordered sample also included a Library of Congress photograph of soldiers and Commons titles referring to Bangladesh embroidery, a Kyrgyz weaver and a keyring. This reinforces that `tradition ILIKE '%ukrain%'` is a retrieval label, not proof of embroidery subject, origin or suitability.

The structural evidence extractor now refuses to count repeated object IDs, repeated normalized source-object URLs (ignoring URL fragments), repeated image hashes (case-insensitive), or repeated institution/object-family identities (case-insensitive) as independent support. Invalid web URLs, null records and malformed operations fail closed. This prevents a single catalog object relabeled with a different hash or source ID from satisfying the two-object evidence threshold. It does **not** independently establish reviewer authenticity, license compliance or cultural approval. It does not alter immutable ASCEND source glyph geometry.

The Art Institute of Chicago's [official API documentation](https://api.artic.edu/docs/) distinguishes public-domain metadata from permission to use images: it advises checking public-domain status and obtaining any necessary rights for a use case. A catalog `Public domain` string remains non-admitting. Independently inspect each primary object page, its actual image/medium, attribution, rights terms and object-family relationship before any reviewer may set approval.

**Verification:** source and regression test changes committed to draft PR #35 on 2026-11-07. Isolated TypeScript strict compilation and ten direct Node assertions passed locally for the new extractor behavior, including lineage remaining non-production. Full GitHub CI on the latest head must be checked separately. No source image was approved, no benchmark SVG produced, and no manufacturing/physical validation performed.

**Next:** reconcile the branch with the two newer `main` commits without weakening gates; complete a small independently reviewed multi-source Ukrainian textile subset; run the fixed-seed actual-engine A/B SVG benchmark. Continue the POA's garment/3.7 baseline and manufacturer-validation work only with traceable reference-versus-validated states.
