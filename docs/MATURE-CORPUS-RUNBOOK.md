# Mature Corpus Runbook

Target: **750,000 analyzed image-bearing pattern instances**. This is not a catalogue-record target.

Pipeline: bulk enumerate -> textile/pattern filter -> rights/access gate -> deduplicate -> image/IIIF fetch -> image analyzer -> structural layers -> fragment graph -> vocabulary discovery -> provenance graph -> train/validation/holdout split.

Quality gates: >=300 named traditions; >=250 independent source groups; >=30 geographic regions; >=12 technique families; no single tradition >2%; no single source >5%; >=65% image-eligible; restricted/sacred records excluded from automatic commercial derivation.

Sampling is adaptive. Underrepresented traditions/techniques receive priority. Stop adding near-duplicates when structural-family saturation exceeds threshold; redirect capacity to coverage gaps.

Splits are provenance-aware: objects from the same source series/object family cannot leak across train and holdout. Holdout includes unseen institutions and unseen named traditions where feasible.


## Quantitative milestone ladder

- **25,000 analyzed instances** — pipeline smoke/coverage checkpoint; enough to expose ingestion bias, duplicate pressure and missing metadata.
- **100,000 analyzed instances** — intermediate structural-learning checkpoint; evaluate family saturation, source imbalance and holdout leakage.
- **250,000 analyzed instances** — first serious Tesseract training milestone. This is the active corpus-250k program.
- **500,000 analyzed instances** — expansion checkpoint; redirect acquisition toward underrepresented traditions, techniques and regions.
- **750,000 analyzed instances** — mature corpus target for broad structural coverage and stronger generalization tests.
- Upstream enumeration may require **millions of candidate object records** because rejected, duplicate, inaccessible, non-image, rights-blocked and culturally restricted records do not count.

A record counts toward the milestone only after image analysis, deduplication, provenance capture, rights/access evaluation and cultural-safety classification.
