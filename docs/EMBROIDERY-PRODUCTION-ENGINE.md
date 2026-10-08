# Embroidery production engine: reference and build spec

This document covers the path from a Tesseract design (vector, in millimetres) to a stitch file a machine can sew on a specific fabric, at the right size, wrapping correctly around a cuff, collar, sleeve or boot shaft.

All numbers below are **industry starting points**. Every one becomes a **validated rule** only after a sew-out on the real fabric with the real stabilizer and thread (see §9). The engine stores those validated values per material and per manufacturer.

---

## 1. Pipeline

```
Tesseract semantic topology
 → octave-controlled structural development
 → ProductionGlyphObject IR
 → product placement (pattern piece, size, zone)
 → machine + garment construction envelope
 → wrap-around fit / registered segmentation
 → material compensation (shrinkage, take-up, pull/push)
 → stitch-family compilation (run / satin / fill)
 → routing, underlay, density and sequence
 → SVG preview + stitch file (DST + PES/EXP as needed)
 → run sheet (threads, needle, stabilizer, hoop, speed, placement)
 → sew-out → measure → corrected recipe → production
```

**Implementation:** `packages/stitch-engine` (TypeScript, no dependencies) implements §5–§8:
- stitch generation: running and triple run, satin with width-based underlay and pull compensation, tatami fill with staggered rows, region splitting for concave shapes, and edge-run plus light perpendicular underlay;
- planning: colour blocks, nearest-neighbour order, tie-in and tie-off stitches, a trim on jumps over 7 mm;
- a DST writer and reader, checked against pyembroidery (same stitch count, same bounds);
- wrap-around fit with per-size grading, and the compensation pre-scale;
- the fail-closed gate, the run sheet and an SVG preview;
- starting recipes for linen, cotton, knit, terry and leather.

`npm run demo -w @ascend/stitch-engine -- <outDir> 250 24` produces a cuff band (DST, preview, run sheet). Every recipe stays `validated: false`, so the gate blocks release until a sew-out stores measured values (§9).


### Production-object rule

The engine no longer treats SVG as the authoritative design representation. Each generated element is first represented as a production object carrying its semantic identity, physical footprint, allowed scale interval, minimum clearance, connection relationships, stitch family, spacing, underlay, compensation and placement/seam behavior.

Scaling or moving an object causes its embroidery representation to be regenerated from those properties. The machine stitch file is never blindly geometrically scaled.

### Machine templates

`packages/tesseract-engine/src/machine-template.ts` defines construction-time machine templates.

A template records:
- maker/model;
- embroidery field;
- heads and needles per head;
- frame types;
- tubular/finished-sleeve support;
- supported stitch formats;
- color capacity;
- maximum SPM;
- registration tolerance;
- practical stitch/run ceiling;
- confidence state.

The currently coded Brother PR1055X and Tajima TMBP2-SC profiles are reference templates only. The selected contract manufacturer's actual equipment must replace them with manufacturer-validated values before production approval.

Machine capability changes generation. The constructor must choose one of:
- single-field embroidery;
- segmented embroidery with registration;
- flat-before-assembly embroidery;
- another compatible machine/profile.

It must not generate a finished-sleeve construction for a machine that cannot physically execute it.


---

## 2. Machines and file formats

| Format | Machines | Notes |
|---|---|---|
| **DST** (Tajima) | Industrial standard. Tajima, Barudan, ZSK, SWF, Happy, and Chinese makers (Richpeace, Feiya, Maya…) all read it | Stitches, jumps, colour changes and trims only; **no thread colours**. Units of 0.1 mm; one record moves at most ±12.1 mm, so longer moves become jumps. **Default export.** |
| **DSB / DSZ** | Barudan / ZSK | Variants used by some factories |
| **EXP** | Melco, Bernina | |
| **PES** | Brother, Baby Lock | Home and semi-industrial; carries colours |
| **JEF / VP3 / XXX** | Janome / Husqvarna-Pfaff / Singer | Home machines; useful for prototyping |

- **Library:** `pyembroidery` (Python, MIT) reads and writes all of the above. **Ink/Stitch** (open-source Inkscape extension) is a scriptable digitizer for prototypes. The industry standard for manual refinement is **Wilcom EmbroideryStudio**; many factories use it.
- **Factory facts to record per manufacturer** (they feed the capability profile):
  - machine brand and model, number of heads, needles per head;
  - maximum embroidery field and the hoop and frame sizes;
  - whether they have tubular, cap or clamp/border frames;
  - maximum speed (SPM), thread brands, and accepted file formats.

---

## 3. Stitch types and limits (40 wt thread)

| Stitch | Use | Typical values | Limits |
|---|---|---|---|
| **Running / triple run** | Outlines, fine lines, boot "fancy stitch" rows | Stitch length 1.5–3 mm (curves 1.5–2, straights 2.5–3) | Shorter than 1 mm risks thread breaks and holes; triple run gives a bold line |
| **Satin (column)** | Borders, strokes 1–8 mm wide | Spacing 0.35–0.45 mm | Narrower than ~1 mm reads as a run; wider than ~7–8 mm snags, so split it or use fill |
| **Fill (tatami)** | Areas | Row spacing 0.40–0.45 mm, stitch length 3–4 mm | Large dense fills stiffen thin linen; reduce density or use open fills |

- **Smallest reliable detail:** about 1 mm satin width, about 0.8–1 mm gap between elements, lettering at least 5 mm high (about 3–4 mm with 60 wt thread).
- **Stitch count:** fill runs roughly 1,500–2,000 stitches per square inch, at roughly 700–1,000 stitches per minute.

  Run time ≈ stitches ÷ speed + colour changes × ~10 s + trims × ~5 s. Factories often price per 1,000 stitches.

---

## 4. Fabric and material parameters

The engine keeps a **material record** for each fabric.

| Field | Why it matters |
|---|---|
| Composition (e.g. 100% flax linen) | Fibre behaviour, wash shrinkage |
| Weight (GSM), weave (plain, twill), threads/cm | Density tolerance, puckering risk |
| Stretch (woven, knit, leather) | Pull compensation, stabilizer choice |
| Shrinkage warp/weft after the specified wash (%) | Pre-scaling (§6) |
| Pre-washed? | Linen not pre-washed shrinks about 3–5% (measure it) |
| Surface (flat, terry/pile, leather grain) | Topping, knockdown stitches |
| Colour | Thread contrast |

**Starting recipes:**

| Material | Stabilizer | Needle | Density | Pull compensation | Notes |
|---|---|---|---|---|---|
| **Linen ~180 GSM, pre-washed** | Medium cut-away or mesh (or medium tear-away plus fusible for light designs) | 75/11 sharp | Fill 0.42–0.45 mm, satin 0.40 mm | 0.2–0.3 mm | Speed 600–750 SPM; hoop taut but **not stretched**; embroider **cut panels before assembly** |
| **Cotton shirting** | Tear-away or light cut-away | 75/11 sharp | Standard | 0.2 mm | |
| **Knits / jersey** | Cut-away (always) | 75/11 ballpoint | Lighter, more underlay | 0.3–0.5 mm | Never tear-away |
| **Towel / terry (rushnyk-style towels)** | Tear-away, plus **water-soluble topping** | 75/11–80/12 | Denser, with a knockdown stitch under the design | 0.3 mm | Pile otherwise swallows detail |
| **Leather (boots)** | Tear-away or none; no hoop marks (clamp or adhesive) | Leather/wedge 80/12–90/14 | **Low**: avoid dense fills, stitch length ≥ 2.5–3 mm | ~0 | **Every hole is permanent**; sew on flat shaft panels before the boot is made |
| **Paper / diary covers** | n/a | n/a | n/a | n/a | Print, foil (min line ~0.25–0.3 mm), deboss (min line ~0.5 mm), or an embroidered fabric cover |

**Underlay** (sewn first to stabilise):
- centre run for satin under 2 mm;
- edge run plus zigzag for satin over 2 mm;
- edge run plus a light tatami for fills.

**Pull and push:**
- Stitches **pull in** perpendicular to their direction, so columns get narrower. Pull compensation widens them.
- Stitches **push out** along their direction, so fills get longer. The digitizer shortens them.

---

## 5. Placement and wrap-around

Every product zone is defined on the **pattern piece** in millimetres for each size:

| Zone | Size-dependent measure |
|---|---|
| Cuff band | Cuff length (wrist circumference + ease), seam or placket position |
| Collar band | Collar length (neck + ease) |
| Sleeve band | Sleeve circumference at the band height |
| Placket | Placket length, button positions (exclusion zones) |
| Yoke / back | Yoke width and depth |
| Towel end | Towel width |
| Boot shaft panel | Shaft height and panel width (front and back panels sewn flat, then closed) |
| Diary cover | Cover size, spine width, wrap-around from front through spine to back |

**Wrap-around fit** (bands that close on themselves):

1. Usable length: `L = finished length − 2 × seam allowance − closure overlap`.
2. Repeat count: `n = round(L / P)`, where `P` is the design's natural repeat period.
3. Fitted period: `P′ = L / n`, which must stay within the design's tolerance (±5% default).
   - If it doesn't, try `n ± 1`.
   - If that also fails, insert a **[VOID] / event segment** (the `AAA | B | AAA` grammar) to absorb the difference. The pattern then closes cleanly at the seam rather than being cut mid-motif.
4. **Seam alignment:** put the seam or closure on a void or segment boundary, never through a motif.
5. Recalculate **per size**. A grading table gives `n` and `P′` for each size, so every size closes perfectly.

---

## 6. Material compensation (geometry pre-scaling)

Applied before digitizing, along each axis:

```
scale_axis = (1 + takeup_axis) / (1 − shrinkage_axis)
```

- `shrinkage_axis` is the fabric's measured wash shrinkage, if the garment is washed **after** embroidery. It's 0 for fabric pre-washed before embroidery.
- `takeup_axis` is the shortening caused by embroidery tension along the band. Start at 1–2% for dense satin bands on linen, and **measure it in sew-outs**.

Pull compensation (§4) is applied per object during digitizing, not as a global scale.

---

## 7. Digitizing rules for generated designs

The engine generates stitches automatically for the motif types Tesseract uses:

| Vector element | Stitch plan |
|---|---|
| Stroke ≤ 1 mm | Running or triple run along the path |
| Stroke 1–8 mm | Satin along the stroke centreline, angle perpendicular to the path, with underlay by width |
| Area or stroke > 8 mm | Tatami fill at a chosen angle (fill angles vary between neighbouring areas so they read separately), edge-run underlay |
| Small dots/seeds < 3 mm | Satin "bean" or a small fill; never a dense fill |

**Sequencing:**
- order objects to minimise jumps and trims (nearest-neighbour across each colour);
- one colour block per thread;
- tie-in and tie-off stitches at every start and end;
- a trim when a jump is over ~7 mm.

**Checks** before a file is released (the **fail-closed gate**):
- every satin is between 1 and 8 mm wide;
- no gap under 0.8 mm;
- no stitch under 1 mm;
- the design fits the factory's hoop or frame;
- the stitch count and run time are within budget;
- density is within the limit for the material.

---

## 8. Run sheet (sent with every file)

- Design ID and revision, size, zone, mm placement from the pattern-piece reference point.
- Stitch file name and format, stitch count, estimated run time.
- For each colour block: thread brand and number (e.g. Madeira Polyneon / Isacord), plus a Pantone reference.
- Needle type and size, stabilizer, topping, hoop or frame, speed (SPM), tension notes.
- Material record ID (fabric lot) and recipe version.
- A QC checklist: dimensions ± tolerance, registration, puckering, thread breaks.

---

## 9. Sew-out validation loop

The strip is generated by `npm run calibration -w @ascend/stitch-engine -- <outDir> [recipeId]`: DST, preview, run sheet and a measurement sheet (CSV) listing the 29 items to measure after stitching and after washing.

1. Stitch a **test strip** on the target fabric and stabilizer: the band at the actual size, plus a calibration panel. The calibration panel has satin widths of 0.8–8 mm, fill densities of 0.35–0.50 mm, lines of 1–4 mm, and the secure-code motif variants (§10).
2. **Measure:** band length (take-up), column widths (pull), registration, puckering, legibility, and read-rate for the secure code.
3. **Wash** per the care spec, then measure again (shrinkage).
4. **Store** the measured values as the validated recipe for that material, thread, stabilizer and factory. The generator then uses them, so designs that would fail are never produced.

---

## 10. Secure glyph code (encoded ornament)

Encoded ornament carries data in **which variant** of a motif is stitched: normal, mirrored, rotated, or with a detail added or removed. Embroidery limits apply:

- Variants must differ by features **≥ 1.5–2 mm** at stitch scale (well above the ~1 mm detail limit).
- Motif pitch is ≥ 8–10 mm on garments and can be smaller in print.
- Capacity is roughly 1–2 bits per motif. A 60–80 motif band carries about 100–150 bits after error correction, enough for a short signed public layer plus an encrypted payload (blood type, Rh, critical flags).
- **Stitch-angle channel:** satin directions at data points differ by ≥ 45°. The sheen contrast must be measured on the chosen thread: polyester and rayon are glossy; cotton and matte threads are poor for this channel.
- **Colour channel:** near-shade thread pairs, measured after washing and light exposure.
- The sew-out calibration panel includes every variant, angle and shade, so the reader is tuned to real stitches.

The design is in `docs/SECURE-GLYPH-CODE.md`.
