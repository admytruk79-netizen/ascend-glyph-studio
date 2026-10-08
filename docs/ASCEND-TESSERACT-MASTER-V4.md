# ASCEND Tesseract: Master Document v4 (status 8 October 2026)

This updates the v3 project description (`docs/ASCEND-TESSERACT-PROJECT.md`). It records what now exists, what each function does, the decisions taken, and what comes next. The v3 principles still hold:
- Tesseract is a language engine;
- Oleksandr's drawings are the source DNA;
- meaning is stated only at its evidence grade;
- no museum motif is ever copied.

**Product scope (decided):** apparel (embroidery and print, starting with the linen shirt), diaries and paper goods, and Western boots. No ceramics, metal or architecture.

---

## 1. Where things stand

| Part | Status |
|---|---|
| Research corpus | **32,695 analysed objects** (past the 25,000 milestone), 27,951 harvested records, loaded into **Neon** (project `ascend-glyph-studio`) |
| Focus traditions | Ukrainian 2,787 · Belarusian 362 · Lithuanian 129 · American Indian (structure only) 151 · English 16th–19th c. 4,539 · cowboy/Western relabelled in the next run |
| Meaning layer | 34 motifs with folk names and evidence grades, plus composition rules from the scholarly literature |
| Pattern generator (blend engine v0.1) | Working: traditions + meanings → band designs, self-checked |
| Stitch engine | Working: design → DST machine file, wrap-around fit, fabric compensation, safety gate, run sheet |
| Calibration strip | Ready to sew (29 measurement points) |
| Secure glyph code | Prototype working: encrypted blood type and medical flags inside the ornament |
| Vision scorer (CLIP) | Built; first scoring run on GitHub |
| Training proper | Waiting on Oleksandr's drawings (private repo `ascend-originals`) and the first sew-out |

---

## 2. Decisions taken today

1. **Training focus:** about 50% Ukrainian, 25% cowboy/Western, 15% American Indian (structure only), plus small Belarusian, Lithuanian and English shares (`data/training/focus.json`).
2. **American Indian material is used for structure only:**
   - Tesseract learns symmetry, rhythm, density and banding from it.
   - It never takes motifs or palettes, never uses tribal names, and never markets anything as Native-made (Indian Arts and Crafts Act).
   - Sacred, ceremonial and funerary objects are excluded at the gate.
3. **CC BY-SA (share-alike) images are accepted** for measurement only. No image is stored or republished, and the source is credited in each design's lineage. Non-commercial and no-derivatives images stay in review.
4. **No Europeana**, because it needs a key. Keyless sources were added instead.
5. **Neon:**
   - Tesseract writes to the `ascend-glyph-studio` project.
   - Roviq got separate `staging` and `e2e-test` branches (the latter with an empty `roviq_e2e` database), and its `main` branch is protected.
6. **Product scope** as above; ceramics excluded.

---

## 3. Functions: what each part does

### 3.1 Research corpus (`scripts/`, GitHub Actions "Tesseract corpus harvest")
- **Sources (all without a sign-up):**
  - The Met, Art Institute of Chicago, Cleveland Museum of Art, V&A;
  - Wikimedia Commons (Ukrainian, Belarusian and Lithuanian categories);
  - Library of Congress;
  - Internet Archive public-domain pattern books;
  - Finna (Finnish museums);
  - Smithsonian when a key is set.
- **Gates:** each object needs:
  - an image of at least 600 px;
  - provenance;
  - an open licence;
  - cultural access (open, structure-only, or review);
  - pattern relevance (in English, Ukrainian, Belarusian, Lithuanian, Polish and German vocabulary).

  Duplicates are removed by ID, image and visual hash.
- **Analysis**, per image: structural features, then deconstruction into:
  - crop, bands, repeat unit;
  - the 7 frieze groups, wallpaper symmetry, rosettes;
  - breaks and rhythm grammar.

  Images are analysed in memory and never stored.
- **Master corpus:**
  - one deduplicated set with stable 80/10/10 train/validation/holdout splits;
  - catalogue metadata (culture, region, date, title) backfilled.
- **Tradition labels** come from the museum's own catalogue text, not the search word. Cowboy/Western objects are recognised by object type with an American, Mexican or Western place.
- **Style profiles:** per tradition, the distributions of symmetry, kind, rhythm and grammar, plus medians of density, void and mirror.
- **Neon tables:**
  - `research_corpus_object` (harvested records);
  - `research_corpus_analysis` (measurements);
  - `research_style_profile`;
  - `design_candidate` (generated designs, scores and your ratings);
  - `style_embedding`.

### 3.2 Meaning layer (`data/semantics/motif-semantics.v1.json`)
- **Evidence grades:** folk-name, folklore, ethnographic, period-emblem, scholarly-interpretive, popular-modern, contested, none.
- **New from Nykorak, Herus & Kutsyr 2022** (woven sashes of West Ukraine and Lithuania):
  - folk names: «в ялинки», «віконця», «павучки», «сонечко», Lithuanian «вужі», «рожа», «жабка», «свічки»;
  - the sash as protection by enclosure («брати в коло»);
  - composition rules: 1/3/5/7-part symmetry with the richest band in the centre;
  - the "hundred-pattern" sash and woven-text precedents.
- **Dmytruk 2016:** modern "magic code" claims about the vyshyvanka are modern myth-making. ASCEND makes no magical-protection claims, especially not for the defence line.
- **Reading list** with links: `docs/REFERENCES.md` (Tumėnas, Tamošaitis, Volkovicher, Selivachov…).

### 3.3 Pattern generator: blend engine v0.1 (`packages/blend-engine`)
- **Input:** tradition weights, meanings (protection, family, ascent, sun, fertility, road, growth, light…) and a product zone (e.g. a 250 mm cuff).
- **Meanings → motifs:**
  - protection → enclosing rails plus a rhomb-with-seed event;
  - family → mirrored pairs;
  - ascent → branch (mirrors into the «в ялинки» chevron);
  - fertility → seeded rhomb;
  - sun → six-ray «сонечко».

  Each choice carries its semantics entries.
- **Tradition weights → symmetry group** (all 7 frieze groups), proportions, chance of a central event motif, and palette. Measured profiles take over from literature priors once a tradition has 30 or more objects. Structure-only traditions never affect motifs or palette.
- **Wrap-around fit:** an integer number of repeats, with the seam on a boundary and the `AAAA | B | AAAA` grammar.
- **Self-checks:**
  - the analyser must read back the intended symmetry, which is verified for every motif in every group;
  - the stitch gate must pass.
- **Lineage** recorded per design: weights, meanings, sources, structure.
- **Motifs are provisional placeholders** until Oleksandr's drawings are traced.

### 3.4 Vision scorer (`scripts/score`, workflow "Tesseract design scoring")
- CLIP (pretrained, no training needed) embeds about 200 corpus images per tradition, producing a centroid per tradition.
- **Each generated design is scored for:**
  - resemblance to the requested blend;
  - alignment with plain descriptions of each tradition;
  - "generic clip-art" risk;
  - its nearest single museum object. A design that is too close (cosine ≥ 0.95) is rejected as a near-copy.
- Results go to Neon (`design_candidate`) for ranking and for your ratings.

### 3.5 Stitch engine (`packages/stitch-engine`)
- **Stitches:** running and triple run; satin (1–8 mm) with width-based underlay and pull compensation; tatami fill with staggered rows and region splitting.
- **Ordering:** colour blocks in nearest-neighbour order, tie-in and tie-off, a trim on jumps over 7 mm.
- **File format:** Tajima **DST** writer and reader, verified against pyembroidery.
- **Fitting:** wrap-around fit with per-size grading; compensation pre-scale `(1 + takeup) / (1 − shrinkage)`.
- **Fail-closed gate:** satin width, minimum stitch length, gaps, fill density, hoop fit, stitch and time budget, and a validated recipe.
- **Output:** run sheet and SVG preview.
- **Starting recipes:** linen ~180 GSM, cotton shirting, knit, terry, leather boot panel.
- **Calibration strip:**
  - satin widths 0.8–8 mm;
  - fill densities 0.35–0.50 mm;
  - stitch lengths;
  - take-up and shrinkage lines;
  - stitch-angle patches for the secure code;
  - gap test;
  - a measurement sheet.

### 3.6 Secure glyph code (`packages/glyph-codec`, prototype)
- **Public layer** (item ID, signed) and **secret layer** (blood group, Rh, 8 medical flags), sealed with AES-256-GCM.
- **Error correction:** Reed–Solomon with interleaving, so seams and wear don't break the read. Start and end markers mean the band reads in either direction.
- **Registry:** an Ed25519 signature registry with unique serials and key revocation.
- **Layout:** a cuff block of 4 × 31 motifs at 8 mm (248 × 36 mm). It goes straight into the stitch engine.
- **Safety test:** in 400 random damage tests the reader **never** showed a wrong blood type: it decrypts correctly or says "not readable".
- Field use only through **Brave1**. Medics must never be locked out, and the code does not replace standard medical ID.

---

## 4. Next for training (in order)

1. **Oleksandr's drawings → ASCEND primitives.** This is the main gap: create the private GitHub repo `ascend-originals` and upload them.
   - The traced primitives replace the placeholder motifs, so designs become ASCEND rather than generic folk geometry.
   - A small add-on model (a LoRA) is then trained on the drawings, either on a rented GPU or via Replicate or fal.ai, at roughly $5–30 per run.
2. **Rate designs:** a simple page shows generated designs and you pick or reject them. Your choices are stored in Neon (`design_candidate.rating`), and the engine learns your taste (preference learning, no GPU needed).
3. **Measured profiles take over:** the next corpus runs relabel cowboy objects and add the American Indian structure searches. The engine then follows measured statistics rather than book assumptions.
4. **First sew-out** of the calibration strip on the real linen. This turns the starting recipe into a validated one and opens the production gate.
5. **Secure code:** the phone reader prototype (camera sweep → decode, offline).

---

## 5. Where everything is

- **Code and documents:** GitHub `admytruk79-netizen/ascend-glyph-studio`, branch `claude/tesseract-corpus-harvest`. The v3 description and README are on `main`.
- **Data:** Neon project `ascend-glyph-studio` (production branch), plus GitHub run artifacts `tesseract-master` (corpus, stats, style profiles) and `tesseract-scores-*`.
- **Detailed documents:**
  - `EMBROIDERY-PRODUCTION-ENGINE.md`
  - `SECURE-GLYPH-CODE.md`
  - `BLEND-ENGINE.md`
  - `TESSERACT-DECONSTRUCTION.md`
  - `REFERENCES.md`

---

## 6. Integrated production-object architecture — October 8 update

The current build is moving from an SVG-first generator to a **production-object-first language compiler**.

The authoritative flow is now:

**semantic intent → ASCEND topology → octave development state → structural grammar / evidence rules → ProductionGlyphObject IR → garment + machine construction envelope → wrapped/pattern-piece placement → embroidery compiler → SVG preview + stitch plan/DST → immutable production manifest → ROVIQ manufacturing orchestration**

SVG is a preview/projection format. DST is a machine-output format. Neither is the canonical design object.

### 6.1 Octave development controller

The octave model is implemented as a hierarchical development controller, not as a literal seven-way fractal.

Primary stages: **DO → RE → MI → FA → SOL → LA → SI → DO²**.

Ordinary stages continue one main lineage. The **MI→FA** and **SI→DO²** transitions may open subordinate branches, but a branch exists only if production capacity permits it.

The recursive allocator is bounded by garment usable area, minimum feature size, minimum gap, maximum node count, machine stitch capacity, machine color capacity, hierarchy depth, allowed relations, garment zone, and seam policy.

Pre-allocation uses planning equations:

`A(k+1) = b(k) × q(k)^2 × A(k)`

`N(k+1) = b(k) × q(k)^p × N(k)`

where the planning exponent is approximately `p=1` for run/satin behavior and `p=2` for area fill. These are admission estimates only. The compiled stitch plan remains authoritative.

This converts the octave from a symbolic idea into a constrained development grammar: **continue → reach interval → transform/branch if capacity exists → integrate → resolve → promote to a new level**.

### 6.2 ProductionGlyphObject intermediate representation

Each generated semantic node is compiled into a typed production object before garment projection.

A production object carries semantic concept and ASCEND form, canonical geometry reference, physical dimensions and valid scale interval, minimum clearance, connection ports and allowed relations, garment zone and seam policy, wrap/rotation permissions, stitch family, stitch spacing, underlay, pull/push compensation, satin/run/fill parameters, and production-reference basis.

This architecture adapts established embroidery/CAD principles rather than copying proprietary code:

- **Wilcom:** object geometry and stitch properties remain linked; scaling regenerates embroidery behavior.
- **Wilcom Auto Fabric:** substrate changes a bounded set of production parameters.
- **Ink/Stitch:** satin/fill/run objects have different attributes and routing is a later compiler concern.
- **Brother PE-DESIGN:** sew attributes are stitch-type-specific.
- **CLO / Marvelous Designer:** placement is solved on real pattern-piece/UV geometry with padding, scale and rotation constraints.

The source references are recorded in `packages/tesseract-engine/src/production-object.ts`.

### 6.3 Garment surface mathematics

A sleeve is not treated as a flat canvas.

`C(v) = C0 + (C1 − C0) × v/H`

`r(v) = C(v) / (2π)`

`θ = 2πu / C(v)`

The engine maps each production object to the wrapped surface and evaluates physical footprint, angular footprint, seam crossing, shortest wrapped distance, all-pairs juxtaposition, minimum clearance, and usable surface occupancy.

The layout solver now uses the production object's physical footprint rather than guessing from SVG scale.

### 6.4 Stitch and thread mathematics

The stitch engine carries a planning model:

`N(s) = Σ[k(i) × N(i,1) × s^p(i)]`

with family-specific scaling behavior. It also records predicted needle thread, bobbin thread, machine time, color count and trims.

For recursive development:

`N(total) = N0 × Σ(k=0..d) (b × q^p)^k`

This is used for capacity planning. Final counts come from regenerated stitch objects and compiled machine commands.

The production manifest can carry predicted and compiled stitch counts plus the equation/model version and calibration reference.

### 6.5 Machine templates

Machine capability is now an input to generation, not only a downstream validation check.

A machine template includes maker/model, embroidery field, heads, needles per head, maximum colors, frame types, tubular/finished-sleeve capability, maximum SPM, supported stitch-file formats, registration tolerance, practical stitch ceiling, continuous-run limit, and confidence/validation state.

Reference templates currently exist for Brother PR1055X, Tajima TMBP2-SC, and a manufacturer-supplied generic industrial multi-head profile.

Reference templates are **not** production truth. A Chinese or other contract manufacturer must provide actual machine inventory and validated limits. Those values are stored as manufacturer-validated templates and become construction constraints.

A selected machine can therefore change the legal design space before generation: no tubular capability can force flat-before-assembly; a small field can force registered segmentation; needle count constrains color plans; registration tolerance constrains continuity; stitch/run ceilings constrain recursive expansion.

### 6.6 Manufacturable-by-construction rule

Production validation remains fail-closed, but the design goal is stronger:

> **Impossible states should not be generated.**

The constructor should admit only structures satisfying semantic rules + cultural rules + garment geometry + material recipe + machine template + stitch-family rules + placement rules + octave capacity.

The final gate verifies the compiled result and catches implementation/calibration errors. It should not be the primary mechanism for discovering obviously impossible designs.

### 6.7 Manufacturer templates and scale production

For contract manufacturing, each real factory receives a capability profile containing factory ID, machine templates and quantities, heads/needles, frames, accepted formats, supported fabrics, validated recipes, minimum reliable stroke/gap, density limits, registration tolerance, actual throughput, sampled defect history, and validation status.

Tesseract generates against the selected profile. ROVIQ receives the immutable production package and handles routing, work order, materials, QC and shipment.

This allows a local prototype machine and a large Chinese multi-head factory to use the same semantic design language while receiving different valid manufacturing projections.
