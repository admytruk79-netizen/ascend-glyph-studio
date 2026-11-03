# Structural fragment synthesis — current limits and acceptance gate

The first implementation works on **manually annotated topology**, not raw images. No museum photograph has been ingested, segmented, or cleared for training by this change. Source observations require explicit source IDs, verified metadata, permitted structural-study rights, and either `structural-public` or `documented-public` cultural access. Uncertain, community-specific and sacred-restricted observations are rejected. This is a policy gate, not a claim of legal clearance.

The fragment library stores only abstract relations, node/edge counts, and normalized scale ratios. The recombination operator adds abstract relations to an ASCEND-native skeleton. It does not transplant historical contours, nodes, or stitch layouts. The search API accepts an optional fragment library; the batch API forwards it. Candidate traces label the operation `structural-reference-only` and identify contributing source IDs. With no fragment library, legacy generation remains unchanged.

## Next evaluation

1. Assemble a small, **documented and rights-reviewed** corpus of Ukrainian embroidery references with source records and cultural context. Do not infer permissions from public web visibility.
2. Annotate motifs at stitch, submotif, motif and border levels; retain segmentation provenance and uncertainty, and reject culturally restricted material.
3. Run fixed-seed A/B tests: baseline without fragments versus identical search parameters with fragments. Compare candidate topology metrics, diversity, novelty, layout coherence, source lineage and visual review. Report the actual candidate counts and seed list.
4. Require manual inspection for visual quality and copying risk before selecting output. Automated scores alone cannot establish originality or cultural appropriateness.
5. Keep machine profiles, stitch constraints, registration, and sew-out status labeled reference-only until manufacturer documentation and physical samples validate them.

**Not completed:** pixel segmentation, actual source ingestion, visual superiority over baseline 3.7, production machine validation, sew-outs or production approval.
