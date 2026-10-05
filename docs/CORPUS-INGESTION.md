# Tesseract Corpus Ingestion Policy

## Goal
Feed Tesseract a broad research corpus without turning it into a motif-copying machine. Raw material is evidence; it is not automatically a design primitive.

## Corpus scale targets
- Active milestone: **250,000 analyzed image-bearing pattern instances**.
- Mature target: **750,000 analyzed image-bearing pattern instances**.
- Source-diversity target: **10,000 distinct source endpoints / collections / institutional sources**.
- Expected upstream enumeration: **millions of candidate records**.
- Mature coverage: **300+ named traditions, 250+ independent source groups, 30+ geographic regions, 12+ technique families**.
- Balance limits: no single tradition >2%; no single source >5%.
- Validation: 10% provenance-aware holdout.

These are quality-gated analyzed-instance counts, not raw scrape totals.

## Corpus lanes
1. ASCEND primary sources — Oleksandr's drawings, books, philosophy and canonical geometry.
2. Ukrainian material culture — embroidery, woven skirts/zapasky, rushnyky, shirts, belts, metalwork, woodwork, ceramics, pysanky, sacred art and regional costume.
3. Western working culture — garment construction, yokes, saddlery, tooling, silverwork, repair, ranch/trail material logic.
4. Indigenous North American research — Nation/community-specific public sources only, with cultural-access classification. Sacred/restricted material is excluded from commercial synthesis.
5. Geometry/composition — Penrose/non-periodic systems, topology, graph grammar, tiling, rhythm, hierarchy, negative space.
6. Manufacturing — patternmaking, textile behavior, embroidery, machine envelopes, digitizing, registration, finishing and QC.
7. Philosophy/iconology/semiotics — visual meaning, emblematic systems, sacred spatial hierarchy and competing interpretations.

## Required record
Every ingested item should preserve:
source URL or bibliographic locator; institution/author; date/period; people/region where known; object/material/technique; rights/access status; source reliability; cultural-access status; extracted structural principles; semantic claims with confidence; image/object IDs when available; and whether commercial design reuse is permitted.

## Separation rule
Store four distinct observations:
- visual similarity
- structural similarity
- semantic similarity
- philosophical similarity
Never infer one from another.

## Rights and cultural safety
Public-domain/open-access does not erase cultural context. Rights status and cultural-access status are separate fields. Sacred/restricted/community-specific content may be studied for context but must not become commercial source geometry.

## Initial high-value institutional corpus
- Metropolitan Museum of Art Open Access Ukrainian textile objects and metadata.
- Library of Congress / World Digital Library Ukrainian and Ruthenian historical craft books and American Folklife Center Ukrainian embroidery oral history.
- Smithsonian Folklife Ukrainian material-culture context.
- Ukrainian academic repositories already represented in the live corpus.
- Ukrainian sacred-art research already represented in the live corpus.

## Immediate ingestion priority
A. object-level Ukrainian textile/material-culture records;
B. regional/contextual metadata;
C. composition and construction observations;
D. historical pattern/craft books with reusable rights;
E. manufacturing references;
F. Western working-craft sources;
G. Nation-specific Indigenous public scholarship with access controls.

## Engine rule
Retrieval can expose many sources to the solver, but synthesis receives principles and evidence links—not raw source motifs—unless a source is explicitly ASCEND-owned canonical geometry.
