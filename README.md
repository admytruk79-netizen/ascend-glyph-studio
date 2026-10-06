# ASCEND Glyph Studio / Tesseract

ASCEND Tesseract is a research, synthesis and production system for building a new **language** for ASCEND — a coherent symbolic, visual, spatial and eventually machine-readable language. ASCEND Glyph Studio is the customer-facing product layer on top of it.

Tesseract is a **language engine**, not a pattern generator. It defines vocabulary, syntax, grammar, transformation rules, context, provenance, reading rules and production rules so that ASCEND forms carry meaning consistently across media.

> **Meaning becomes structure. Structure becomes language. Language becomes material. Material becomes product.**

**The authoritative project description is [`docs/ASCEND-TESSERACT-PROJECT.md`](docs/ASCEND-TESSERACT-PROJECT.md) (v3).** This README summarizes it and records the current build status. Where they disagree, the project description wins.

**ASCEND philosophy → source drawings → semantic intent → structural grammar → research corpus → generative synthesis → quality control → material projection → product preview → production**

## Source DNA

ASCEND identity comes from Oleksandr's original hand-drawn geometry, not from the research corpus. The native primitives are:

**Seed · Line · Axis · Torus · Orbit · Branch · Crossing · Opposition · Radial Emission · Void**

Source geometry must be preserved faithfully. Tesseract may transform, combine, rotate, intersect, branch, repeat, interrupt or scale these forms, but must not replace them with generic AI symbols.

The research corpus teaches **how forms can behave**; it never replaces the ASCEND vocabulary.

## Semantics and grammar

Initial concepts include Origin, Land, Ancestors, Lineage, Home, Freedom, Will, Courage, Protection, Brotherhood, Journey, Crossing, Choice, Transformation, Healing, Knowledge, Perception, Love, Union, Death, Return, Renewal, Earth, Cosmos, Spirit and Ascent.

Meaning is not a one-symbol/one-definition lookup. It is carried by relationships and operations: repeat, nest, alternate, mirror, interrupt, enlarge, reduce, branch, surround, penetrate, cross, orbit, terminate, return, vanish, emit, oppose.

Pattern grammar examples: `AAAA` continuity · `AAA | B | AAA` event · `ABAB` duality · `ABCBA` return · `A → A′ → A″` development · `AAA [VOID] AAA` passage · small → medium → large emergence.

Scale hierarchy: **S1** particle/stitch → **S2** primitive/glyph → **S3** compound → **S4** phrase/band → **S5** field/garment. A design must work at several viewing distances.

### Anti-generic system

The engine rejects generic diamonds, endless chevrons, symmetrical mystical emblems, pseudo-tribal styling, unnecessary flames, repetitive identical flowers, automatic tree-of-life compositions, same-scale repetition, decorative wallpaper, excessive bilateral symmetry and culturally ambiguous fusion. ASCEND designs favour interruption, asymmetry, void, unequal spacing, scale shifts, open ends, non-periodic structure and hidden larger forms.

## Research corpus and training

Historical and living traditions are evidence, not a clip-art vocabulary. The system separates visual, structural, semantic, philosophical and material similarity. Restricted or sacred material is excluded from commercial derivation; for Indigenous research, provenance, community specificity, access restrictions, ceremonial context and commercial-use risk are recorded.

Corpus milestones (accepted, image-bearing, analyzed instances — not raw records):

| Milestone | Purpose |
| --- | --- |
| **25,000** | Validate acquisition, deduplication, provenance, analysis and training pipeline |
| **100,000** | Meaningful cross-source structural learning |
| **250,000** | First serious pattern-model training milestone |
| **500,000** | Broaden traditions, techniques, materials and edge cases |
| **750,000** | Mature corpus target |

Additional targets: ~**10,000 independent source endpoints** (an individual museum object never counts as a source); **10% provenance-aware holdout**; mature coverage of ≥300 named traditions, ≥250 independent source groups, ≥30 regions, ≥12 technique families, no tradition >2%, no source >5%, ≥65% image-eligible.

Pipeline: discover sources → enumerate candidate records → retrieve imagery → deduplicate → rights and cultural gates → analyze geometry and composition → structural fragments and relationships → train/validation/holdout splits → train and evaluate the **pattern-language model** → combine with ASCEND source DNA → generate candidates → reject copying, generic output and culturally unsafe results → validate production → preserve provenance and lineage.

See `docs/CORPUS-INGESTION.md`, `docs/MATURE-CORPUS-RUNBOOK.md`, `docs/UNIVERSAL-PATTERN-DERIVATION.md` and `docs/CULTURAL-SEMANTIC-GAP-MATRIX.md`.

## Product scope

ASCEND products are limited to forms that are **easy to embroider or print**:

| Product line | Production methods | Example placements |
|---|---|---|
| **Apparel**: shirts (linen first), overshirts, rushnyky/towels and other textiles | Machine embroidery, print (DTG, screen, sublimation) | Collar, cuff, placket, sleeve, chest, yoke; towel ends and borders |
| **Diaries and paper goods**: diaries, notebooks, journals | Print, foil, embossing/debossing on covers | Cover field, spine band, corner mark, endpapers |
| **Boots**: Western boots | Shaft stitching, leather tooling, inlay/overlay | Shaft panels, collar band, toe and vamp stitching |

This scope decision (2026-10-06) narrows the wider product list in the project description, and it takes precedence for the current build.

**Out of scope:** ceramics, metalwork, architecture and other fabrication. The language can extend there later, but the build, the validation rules and the manufacturing partners serve these three lines only. The first product stays the **ASCEND linen shirt**.

## Manufacturing and production

Manufacturing is one of the final layers of the language itself, not an export step. A design that cannot be reliably manufactured is not complete.

**meaning → language → geometry → material rules → production-valid design → manufacturing package → physical object**

- Material- and capability-aware generation: process constraints (embroidery, print, leather tooling and stitching) apply during generation, not only after.
- A manufacturing compiler projects one approved construction into process-specific geometry while preserving semantic lineage.
- Production validation **fails closed**; a design stays non-production until the physical result is validated. A beautiful preview never overrides a failed validation.
- Approved designs produce an **immutable production manifest** (design ID/version, engine and model versions, intent, primitives, grammar, seed, geometry hash, material, process, placement, tolerances, validation results, manufacturer capability profile, provenance, manifest hash).
- **ROVIQ** receives the manifest and runs manufacturer routing, POs, work orders, QC, shipping and delivery.
- Physical sample results feed back as manufacturing intelligence: *research corpus teaches pattern intelligence + manufacturing corpus teaches physical intelligence.*

See `docs/PRODUCTION-ENGINE-POA.md`, `docs/GARMENT-ENGINE-0.1.md` and `docs/ORDER-TO-DELIVERY.md`.

## Glyph Studio (customer flow)

**Choose product → choose meaning → choose character and complexity → choose placement → generate design families → select a design → preview → validate production feasibility → approve → manufacture → track delivery**

The user never needs to understand Tesseract; research and synthesis run in the background. READ (planned) shares one semantic decoder across web, Android and iOS.

## Security and regulated deployment

The secure layer protects the integrity, provenance, authorization, transmission and interpretation of language-bearing structures and restricted semantic payloads. Public research data and restricted/private information are separated.

Current code (`packages/tesseract-engine/src/secure-payload.ts`): AES-256-GCM authenticated encryption with random 96-bit nonce, authenticated version/access-tier/key-ID metadata, explicit key identifiers, an authorization gate, and a restricted-deployment policy requiring external KMS/HSM keys, MFA, device attestation, signed readers, audit logging, key rotation and bounded offline revocation.

Tesseract is **designed for future defense-capable deployment**. It is **not** certified, accredited or approved for military use, uses no proprietary cipher, and has no master backdoor. Any real regulated deployment requires approved identity and KMS/HSM infrastructure, independently reviewed cryptography, hardened endpoints, threat modeling, supply-chain review and applicable accreditation.

See `docs/TESSERACT-SECURITY-ARCHITECTURE.md`.

## Platform architecture

| System | Role |
| --- | --- |
| **Tesseract** | Dedicated PostgreSQL research and synthesis workload |
| **ASCEND Glyph Studio** | Customer-facing design interface |
| **Supabase** | Application databases, Auth, Storage, realtime, Edge Functions |
| **Neon** | Research-heavy PostgreSQL workloads and branching |
| **Render** | Application services, workers, APIs, deployment |
| **ROVIQ** | Manufacturing, fulfillment, logistics and ERP-style workflows |

Systems communicate through explicit APIs and immutable production contracts, not shared uncontrolled tables.

## Current build status — 2026-10-05

| Area | Status |
| --- | --- |
| Source primitives | **Provisional.** Nine primitives are hand-coded approximations in `ascend-primitives.ts` (`source-derived-provisional`); **Line** is not yet defined. None are yet traced from the original drawings. |
| Semantics, grammar, scale, anti-generic evaluation, lineage | Implemented foundations in `packages/tesseract-engine`. |
| Research corpus | Ingestion pipeline, dedupe/checkpoint invariants, Neon importer and research schema exist. **Collected so far: tens of objects**, far below the 25,000 validation milestone. |
| Train/validation/holdout splits, pattern-language model | **Not started.** Generation currently uses explicit grammar and evolutionary search. |
| Manufacturing compiler and validation | Universal production validation, geometry/process adapter contracts and fail-closed diary projection implemented; physical validation pending. |
| Manufacturer capability profiles / ROVIQ routing | Basic manufacturer eligibility in `production-orchestrator`; ROVIQ integration not wired. |
| Cost-aware production | Not started. |
| Supabase | Not yet integrated. |
| Glyph Studio UI | Product, fabric, placement and 3D preview; **no "choose meaning" step yet**; does not yet use canonical source glyphs. |
| Security | Secure payload foundation implemented and tested. |

The renderer is **not yet production-ready**. Specimen sheets come from the engine itself (`packages/tesseract-engine/src/specimen-sheet.ts`). Do not substitute AI concept art for engine output.

### Next priorities

1. Trace the original source drawings into exact canonical primitives, including **Line**.
2. Run the 25,000-instance pipeline-validation corpus.
3. Add provenance-aware train/validation/holdout splits and the first pattern-language model training run.
4. Add the "choose meaning" step to Glyph Studio.

## Repository map

- `apps/web` — Studio/customer interface and 3D preview
- `packages/tesseract-engine` — language, primitives, corpus graph, renderer, evaluation, analytics and security foundation
- `packages/design-schema` — design contracts
- `packages/glyph-engine` — deterministic synthesis infrastructure
- `packages/glyph-registry` — glyph and source-geometry registry
- `packages/spatial-glyph` — spatial/4D projection of glyphs
- `packages/garment-spec` / `packages/material-spec` — production specifications
- `packages/production-validator` / `packages/manufacturing-validator` — production constraints and validation
- `packages/production-orchestrator` — production manifests, order pipeline, manufacturer eligibility
- `packages/erp-core` — ERP planning and workflow model
- `db/migrations` — research, manufacturing, projection and runtime schema
- `docs` — project description, architecture, corpus, security, production and verification documentation

## Non-negotiables

1. ASCEND identity comes from Oleksandr's source geometry and ASCEND philosophy; the research corpus teaches structure only.
2. Do not copy research artifacts or restricted/sacred motifs.
3. Do not invent historical meanings; unknown meanings remain unknown.
4. Do not count objects as distinct sources.
5. The same approved manifest must recreate the same geometry.
6. Generated output must retain provenance and lineage to primitives, principles and evidence.
7. Security must use established authenticated cryptography; visual obscurity is not encryption.
8. Human/cultural review and physical validation remain mandatory before Production Approved; production validation fails closed.
9. The 108-card/Keys art and legacy glyph atlases are not the root vocabulary of the language.
