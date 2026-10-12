# Using museum embroidery charts

Downloaded and read the Ivan Honchar Museum chart PDFs KN-444, KN-23050 and KN-331. Visually inspected the detailed shoulder charts on pages 14 and 12 of the first two PDFs, the Poltava band-5 chart on page 12, and KN-444's density diagram on page 6. This is a focused page study, not a full visual decomposition of all three publications. Local PDFs and rendered pages remain outside the repository.

The source-study manifest retains PDF hashes, regional evidence, chart authors, page locators and restrictions. KN-444 is attributed to Hutsulshchyna: vertical stitch runs construct stepped diamond outlines with coloured interiors, separated into unequal bands by crossed lines. KN-23050 is attributed to Podillia: interlocking diamonds contain smaller angular units, and lock markers have their own legend. KN-331 is attributed to Poltavshchyna: quadrant lobes surround a small centre, narrow chains frame the broad repeat, and ten numbered bands use multiple techniques. These observations do not establish botanical species or symbolic meanings.

KN-444 page 6 documents 32 warp threads and 25 weft threads over 2 cm in each direction; page 5 specifies centimetre units. Thus the reference pitches are 0.625 mm and 0.8 mm, not square pixels. The new calibrateCountedFabricGrid helper converts counted fabric intervals into reference millimetres using separate measured axes and documentary evidence. It does not trace a museum chart, assign stitch counts, alter canonical glyph transforms, produce machine stitches, or certify an actual fabric sample. It is available to reconstruction callers but has not been wired into automatic image extraction or production compilation.

All three PDFs explicitly prohibit commercial use on page 2 and request attribution. They remain restricted study records, eligibleForMotifGraph=false. No chart geometry or photograph is committed as an engine fixture. Their documented regions apply only to these museum objects, not to the existing Neon plates.

Verification: engine typecheck/build and all 163 tests across 43 files passed. New tests verify unequal pitches, documentary/measurement validation, input mutation independence and invalid coordinates. No deployment, training or production approval is claimed.

Next reconstruction work should distinguish contour shapes from stitch spans, front from reverse, and lock/legend marks from motif geometry, then use an appropriately permitted reference to test a calibrated extraction. Region-specific techniques cannot safely be collapsed into one generic run-stitch plan.
