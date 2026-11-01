# ASCEND Diary Band Engine — v1

## Goal
Create narrow, high-complexity ornamental bands from ASCEND source glyphs. The band carries the complexity; the diary cover stays quiet.

## Historical design observations
Ukrainian textile traditions vary substantially by ethnographic region. Museum holdings show regional variation in colour, technique, placement and density, while embroidery charts demonstrate multi-register construction: guard lines, repeated minor motifs, a dominant central register and mirrored rhythm.

These observations are compositional references only. No historical ornament is copied.

## Band anatomy
Every band is built on seven registers:

1. OUTER GUARD — smallest source glyph fragments at low density.
2. PULSE — short alternating sequence A-B-A-C with controlled gaps.
3. SATELLITE — secondary glyphs at 35–55% anchor scale.
4. ANCHOR — dominant source/compound glyph at measured intervals.
5. AXIS — continuous visual spine created by alignment, never invented geometry.
6. SATELLITE MIRROR — reflected relational structure of register 3.
7. OUTER GUARD MIRROR — closes the band.

The registers form one woven sentence rather than a row of logos.

## Rhythm
Default phrase:
guard | a b a c | satellite | ANCHOR | c a b a | breath | ANCHOR' | repeat

Use 3 levels of scale:
- micro 0.22–0.35
- secondary 0.40–0.62
- anchor 0.82–1.00

Use deliberate negative-space intervals every 2–4 anchors. Complexity comes from hierarchy and relation, not filling every cell.

## Legal transforms
Source geometry remains immutable. Recipes may translate, uniformly scale, rotate, mirror, repeat, alternate, layer, interlock through placement, and crop only at the band boundary.

Recipes may NOT redraw, smooth, simplify or mutate source paths.

## Compound glyph rule
A compound glyph is a recipe referencing 2–5 immutable source IDs plus transforms. It is not a new source glyph. Save source IDs + versions, transform matrix per layer, z-order, semantic name, family relationship and recipe hash.

## Regional grammars
These are abstract compositional modes, not copied motifs.

### POLTAVA / Breath
Low density. Tonal. Large breathing intervals. Fine guard lines. Anchor every 4 phrases.

### PODILLIA / Threshold
Dense dark field. Strong central register. Anchor every 2 phrases. Tight satellites and hard terminal cadence.

### HUTSUL / Pulse
Highest rhythmic activity. 3–5 alternating sub-registers. Strong scale contrast. Controlled colour accents.

### BUKOVYNA / Jewel
Layered micro-registers and rich material accents. Dense but ordered. Compound anchors separated by fine guard bands.

### POLISSIA / Continuity
Long sequences, reduced palette, clear repeated cadence. Fewer compound anchors; more continuity.

### ZAPORIZHZHIA / Frontier
Open central field with decisive anchor events, longer gaps and strong terminal marks. Material/craft character rather than borrowed historical motifs.

## Diary specification
- Band width: 20–30 mm on a 145 × 210 mm diary.
- Preferred position: 16–24 mm from spine edge.
- Cover: otherwise uninterrupted leather or linen.
- Optional tiny blind-debossed ASCEND wordmark only.
- No large central decorative emblem.
- One band recipe may continue onto spine/endpaper/ribbon as a reduced derivative.
- From 2 m: reads as one stripe.
- From arm's length: reveals rhythm and hierarchy.
- Close up: reveals individual ASCEND glyph relationships.

## Canonical gate
Production rendering MUST fail closed if any source glyph in a recipe is not canonical-digital / geometry-verified. Exploration can use unresolved glyphs only when visibly marked NON-PRODUCTION.

## Current registry implication
The registry currently marks water-02 and water-03 as canonical-digital/geometry-verified. Until the remaining source geometry is verified, full five-family diary bands remain design recipes, not production masters.
