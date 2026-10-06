# ASCEND originals

Oleksandr Dmytruk's own drawings, and the embroidery designs made from them. These are the source DNA for Tesseract: the generator's ASCEND vocabulary and palette (`packages/blend-engine/src/ascend.ts`) were traced from them.

© Oleksandr Dmytruk. All rights reserved. They are **not** covered by the repository's code licence and may not be reused without permission.

## drawings/

- `pencil/`: three pencil sketch sheets (blue stars and branches; purple vocabulary; coloured stars, branches and flowers).
- `illustrations/`: thirteen finished illustrations, `01`–`13`.

All are downscaled to 1600 px, with metadata stripped.

## designs/

Each folder holds:
- `.svg`: the design;
- `*-stitches.svg` / `.png`: stitch preview;
- `.dst`: Tajima machine file.

The designs are prototypes. The linen recipe has no sew-out yet, so the production gate still says "prototype only".

| Folder | What it is | Script (`scripts/originals/`) |
|---|---|---|
| `sheet1/` | Blue sketch sheet: `sheet1-*` is the faithful tracing, `sheet1-rich-*` the version elaborated from the research (yalynky, sashes, rhomb-with-seed). Colourways: pencil, ascend, linen. | `sheet1.mts`, `sheet1-rich.mts` |
| `sheet2/` | Coloured sketch sheet: `drawn` is as drawn, `rich` is elaborated; `rich-13131e` is on the night ground. | `sheet2.mts <out> [drawn\|rich] [ground]` |
| `emblem/` | Personal emblem: roots, axis, heart, twin peaks ("A"), open orbit ("O"), star with no downward ray, 10 sequins. Includes the run sheet. | `emblem.mts` |
| `choice/` | A band of the pattern elements picked from the research. | `choice.mts` |
| `rich-bands/` | The six named bands from the design board (Ascend Roots, Mountain Path, River Lineage, Sky Horizon, Fire Within, Earth Anchor), built from the rich folk vocabulary: tree of life with birds, ram's horns, hop vine with grapes, roses, star clusters, crosses, lily, kalyna. 250 × 60 mm, wrap-around, all pass the stitch gate. First pass: foundation, not yet ASCEND-distinct. | `rich-bands.mts` |
| `ascend-bands/` | Ten generated bands in the ASCEND vocabulary (blend engine). | `gen-ascend.mts` |

To regenerate, run this from the repo root:

```
npx tsx scripts/originals/emblem.mts <out-dir>
```

Set `DBG=1` to print short stitches by type.
