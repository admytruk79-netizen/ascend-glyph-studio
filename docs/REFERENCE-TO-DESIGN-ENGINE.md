# Reference-to-design engine — implementation contract (v1)

Status: design contract, **not a trained model**. Canonical ASCEND source drawings remain the only approved glyph geometry. Historical imagery is evidence for compositional behavior, never a glyph source or a production approval.

## Required stages

1. **Reference ingestion**: persist object identifier, institution, stable object URL, image hash, region attribution with confidence, date/technique, rights evidence, cultural access review, permitted use, and extraction version. Unknown rights or access = research-only; restricted/sacred = excluded from commercial derivation.
2. **Analysis**: estimate foreground/background segmentation, motif boundaries, translation periods, reflection axes, border topology, scale hierarchy, filled/void ratio, palette, stitch/fabric technique, and garment placement. Keep numerical measurements separate from interpretive claims. Report uncertainty; do not infer symbolism from appearance.
3. **Structural evidence**: each rule must point to multiple independent eligible objects, never just repeated images of one object. Split train/holdout by object family and institution where feasible to reduce leakage.
4. **ASCEND synthesis**: instantiate rules only with immutable, versioned canonical ASCEND primitives (Seed, Line, Axis, Torus, Orbit, Branch, Crossing, Opposition, Radial Emission, Void). Reference motif pixels and traced outlines must never be copied into output geometry.
5. **Candidate generation**: produce alternative bands, panels and garment layouts with intentional hierarchy, interruption, void, asymmetry, and scale changes; enforce product placement constraints during generation.
6. **Preference learning**: capture pairwise choices, explicit likes/dislikes and requested changes as user preference evidence. Rank candidate compositions; never silently change canonical glyph geometry.
7. **Review gates**: reject source-near-duplicates, unsupported cultural claims, restricted provenance, invalid glyph lineage, and generic repetition. Record which rules influenced each candidate.
8. **Manufacturing**: hand off a chosen geometry and placement to process-specific validation. Software feasibility is not manufacturer validation, and manufacturer data is not physical sew-out approval.

## Typed boundary / future implementation

```ts
type ReferenceEvidence = {
  objectId: string; institution: string; objectUrl: string; imageSha256: string;
  tradition?: string; attributionConfidence?: number;
  rightsStatus: "approved" | "research-only" | "restricted" | "unknown";
  culturalReview: "approved" | "pending" | "restricted";
  techniques: string[]; structuralFeaturesVersion: string;
};
type StructuralRule = {
  ruleId: string; operation: "repeat" | "alternate" | "nest" | "mirror" |
    "interrupt" | "branch" | "surround" | "scale-shift" | "void";
  parameters: Record<string, number>;
  supportingObjectIds: string[];
  evidenceStatus: "research-only" | "approved";
};
type Candidate = {
  canonicalGeometryVersion: string; glyphInstanceIds: string[];
  ruleIds: string[]; sourceObjectIds: string[];
  designStatus: "concept" | "reviewed";
  manufacturerValidated: false; physicallyValidated: false;
};
```

## Acceptance tests before enabling commercial synthesis

- Restricted/pending source cannot contribute to approved commercial rules.
- Identical image hashes and related object variants cannot inflate independent support.
- Every output primitive resolves to a versioned ASCEND source drawing; no source-image tracing.
- Training and holdout objects cannot share an image hash or object family.
- Changing preference scores affects candidate ranking, not source geometry.
- Similarity checks flag near-copies for human review.
- Reference machine specifications never set productionApproved=true.
- Run on documented, provenance-reviewed Ukrainian examples first; expand only after evaluation.

## Ukrainian pilot

Begin with documented Poltava, Hutsul, Borshchiv and Bukovyna examples, **without treating region labels as uniform styles**. Verify institution metadata, material/technique, rights, and attribution before inclusion. Evaluate border rhythm, negative space, sleeve/cuff placement, density and scale. A region/style label must not be assigned from image appearance alone.

## Status

This document specifies the next implementation boundary. It does **not** assert that ingestion, motif segmentation, learned ranking, trained synthesis, automated originality detection or physical manufacturing validation currently pass.
