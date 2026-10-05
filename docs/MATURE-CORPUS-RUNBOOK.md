# Mature Corpus Runbook

Target: **750,000 analyzed image-bearing pattern instances**. This is not a catalogue-record target.

Pipeline: bulk enumerate -> textile/pattern filter -> rights/access gate -> deduplicate -> image/IIIF fetch -> image analyzer -> structural layers -> fragment graph -> vocabulary discovery -> provenance graph -> train/validation/holdout split.

Quality gates: >=300 named traditions; >=250 independent source groups; >=30 geographic regions; >=12 technique families; no single tradition >2%; no single source >5%; >=65% image-eligible; restricted/sacred records excluded from automatic commercial derivation.

Sampling is adaptive. Underrepresented traditions/techniques receive priority. Stop adding near-duplicates when structural-family saturation exceeds threshold; redirect capacity to coverage gaps.

Splits are provenance-aware: objects from the same source series/object family cannot leak across train and holdout. Holdout includes unseen institutions and unseen named traditions where feasible.
