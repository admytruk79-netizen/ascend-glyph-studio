# ASCEND first sew-out pack

Four pieces for the first physical test on the shirt linen. Everything here is a prototype until this sew-out is
measured: the linen recipe is a starting point, and this test is what validates it.

| # | Machine file | Size (mm) | Stitches | Minutes* | Colours | Hoop |
|---|---|---|---|---|---|---|
| 01 Calibration strip | `01-calibration/ascend-calibration-linen-180-prewashed.dst` | 135 × 131 | 5,038 | 11.5 | 2 | 200 × 200 |
| 02 Cuff band «Ascend Roots» | `02-cuff-band/01-ascend-roots.dst` | 250 × 60 | 12,301 | 36.2 | 5 | border frame ≥ 260 × 70 |
| 03 Hidden message band | `03-hidden-message/band.dst` | 340 × 34 | 11,606 | 25.5 | 5 | border frame 360 × 100 |
| 04 QR medallion | `04-qr-medallion/qr-medallion.dst` | 189.7 × 189.7 | 19,491 | 39.4 | 6 | 200 × 200 |

*at 650 stitches/min, before trims and colour changes.

## Materials

- **Fabric:** the shirt linen, about 180 g/m², **pre-washed** (wash and press before hooping, so shrinkage is measured, not sewn in).
- **Stabiliser:** medium cut-away under everything; tear-away is too weak for the fills on linen.
- **Thread:** 40 wt polyester or rayon. Colours are in each preview; the reader needs good contrast with the linen
  (blue star, green leaves, orange/red buds for piece 03; dark indigo for the QR in piece 04).
- **Needle:** 75/11 sharp.

## Sew order

1. **01 Calibration strip** first. Fill in `01-calibration/*.measurements.csv` (after stitching, then again after one wash).
   The 0.8 mm satin, 0.35/0.38 mm fills and the 0.5 mm gap are deliberate limit tests: they are expected to look marginal.
2. **04 QR medallion.** Then scan it with an ordinary phone camera; it should show «ASCEND · Сила роду — у нитці» with no internet.
3. **03 Hidden message band.** Then open the reader on a phone (`https://ascend-glyph-studio.onrender.com/reader/`, once online,
   afterwards it works offline), hold the band level in the box and sweep slowly, or use “Take a photo”.
4. **02 Cuff band**, the visual piece.

## Send back

- Photos of each piece in daylight, straight on, with a ruler in frame; a close-up of any puckering, gaps or thread breaks.
- The completed measurements CSV.
- Whether the QR and the reader worked, how close/far the phone was, and how many photos the reader needed.
- The same after one wash at 40 °C.

These results update the linen recipe (pull compensation, density, minimum gaps) and turn the production gate from
“prototype” into “validated”.
