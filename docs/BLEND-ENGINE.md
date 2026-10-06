# Blend engine: one ASCEND pattern from many traditions

**Goal:** generate a unique, embroiderable or printable ASCEND pattern that **resembles a chosen blend of traditions** and **carries a chosen meaning**, for example:

> Ukrainian 60% · Belarusian 15% · English 17th c. 15% · Western/cowboy 10% · meaning: protection + family + ascent · product: shirt cuff, linen embroidery

The result is new. It is built from ASCEND's own primitives, arranged with structure learned from those traditions, and never copies a museum motif.

## Inputs

| Input | Source |
|---|---|
| **Vocabulary**: what shapes may appear | ASCEND primitives traced from Oleksandr's drawings (Seed, Line, Axis, Torus, Orbit, Branch, Crossing, Opposition, Radial Emission, Void), plus approved ASCEND motifs |
| **Meaning** | `data/semantics/motif-semantics.v1.json`: concepts mapped to primitives and arrangements, each with an evidence grade |
| **Style profiles**: how each tradition builds pattern | Measured from the analysed corpus (deconstruction): distributions of frieze groups, rosette and wallpaper symmetry, repeat-to-band ratio, density, void ratio, rhythm/grammar figures, palette, period. One profile per tradition, region and century. |
| **Product constraints** | `docs/EMBROIDERY-PRODUCTION-ENGINE.md`: zone size, wrap-around, stitch limits, material recipe |

## Style profiles (learned, not copied)

Each tradition is summarised from the corpus as numbers, never images. For example:

- **Ukrainian · Podillia / Bukovyna:** dense geometric bands, frequent `p2mm`/`p1m1`, rhomb-chain rhythm, high density, little void, red/black.
- **Ukrainian · Poltava:** white-on-white, openwork voids, plant forms, low contrast, `p1m1` borders.
- **Belarusian rushnik:** red on white, rhomb chains, mirrored pairs (`p1m1`), central "event" motif.
- **English 17th c. crewel:** non-periodic all-over growth (no lattice), large asymmetric scrolls, high void ratio.
- **English samplers:** stacked horizontal bands with many short repeats, `p1`/`p1m1`.
- **Western boot stitching and leather carving:** parallel stitch rows, scroll orbits, flame and rose curves, mirror pairs across the shaft.
- **Native American (nation-specific):** structure statistics only, for diversity. Never a selectable "style" for motif-level derivation, and never marketed as Native-made (Indian Arts and Crafts Act).

- **West Ukrainian sashes** (Nykorak, Herus, Kutsyr 2022): vertical-axis symmetry, static rhythm; 1-, 3-, 5- or 7-part layouts with the richest band in the centre and finer bands outward, framed by thin stripes; half-motifs in neighbouring bands joining into a whole; rhomb / oblique-cross alternation; close-hue colour "shimmer".
- **Lithuanian sashes** (same source): diagonal axes, S-motifs, rotation without mirror (`p2`, `p11g`), motifs cut by the edge, dark-on-light contrast; "hundred-pattern" sashes where no motif repeats.

The profile itself is the pattern-language model's learned description of how that tradition behaves. Seed rules from the literature are stored in `compositionRules` in `data/semantics/motif-semantics.v1.json`; the corpus measurements confirm or correct them.

**Bands as enclosure.** A closed band (cuff, collar, belt) carries the documented sash meaning of protection by "taking into a circle" (ethnographic grade). The wrap-around rule that no motif is cut at the seam keeps that circle unbroken.

## Composition

1. **Meaning → primitives.** The requested concepts select ASCEND primitives and relations. For example:
   - protection → enclosure, an orbit around an axis;
   - family → a mirrored pair (opposition) around a seed;
   - ascent → emergence, small to large.

   Each choice records its evidence grade.
2. **Blend → structure targets.** The weighted mix of style profiles gives target values:
   - frieze group;
   - repeat length relative to band;
   - density and void ratio;
   - grammar figure (e.g. `AAAA | B | AAAA` with emergence);
   - palette family.

   Conflicting targets are resolved by weight; the dominant tradition sets the symmetry type.
3. **Generate candidates.** Primitives are arranged into motifs and bands meeting the targets, at the product zone's size, with the wrap-around fit.
4. **Score and reject.** Each candidate is checked for:
   - **resemblance** to each requested style profile (it should be close to the blend);
   - **distance** from every corpus object, so it is never too similar to a real museum piece;
   - ASCEND identity, measured against Oleksandr's drawings;
   - generic-AI risk;
   - cultural risk;
   - embroidery and print feasibility.
5. **Explain.** Every output carries its lineage:
   - which primitives it uses;
   - which meaning claims it draws on, at what evidence grade;
   - its blend weights;
   - the structural targets it followed;
   - which tradition profiles it was scored against.

## Example

| Field | Value |
|---|---|
| Request | Ukrainian 60 / Belarusian 15 / English crewel 15 / Western 10; protection + family + ascent; cuff band, 38 cm wrap |
| Structure | `p1m1` (Ukrainian/Belarusian majority) · repeat 3.8 cm → 10 repeats · density medium-high · void 20% |
| Grammar | `AAAA \| B \| AAAA` with the central `B` as the "event", plus emergence inside each `A` |
| Motifs | `A` = mirrored orbit pair (family) around a seed, with rising seeds (ascent). `B` = orbit enclosing an axis (protection) with a crewel-like asymmetric scroll (English influence). Stitch-row outline (Western influence). |
| Palette | Red/indigo on natural linen |
| Meaning note | "Family (folklore-grade, paired birds/ducks), protection (popular-modern grade), ascent (ASCEND concept)" |

## Build order

1. Style profiles from the master corpus. **Built:** `scripts/corpus/profiles.ts` and `scripts/build-style-profiles.ts`, run by the corpus workflow after each merge. They write `style-profiles.json` into the `tesseract-master` artifact and print a summary in the run log.
   - Tradition comes from the museum's own culture, region and title text first. The search query is used only when there is no catalogue text, and such labels are marked "(by query)".
   - `blend()` mixes the profiles by weight. It fails closed for unknown or non-selectable traditions (Native American is structure only) and warns when a profile has fewer than 30 objects.
2. Meaning-to-primitives map from the semantics file, plus ASCEND's own concepts.
3. Candidate generator over primitives, with structure targets.
4. Scorers: resemblance, distance from corpus, identity, feasibility.
5. Lineage/explanation output, which feeds the production manifest.
