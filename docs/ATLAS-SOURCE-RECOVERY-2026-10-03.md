# Authoritative atlas recovery — 2026-10-03

The five source files named by `source-raster-registry.v1.json` were recovered from the user's persistent file library as original, non-generated PNG uploads:

- Earth: `1000069947.png` — 1536×864
- Water: `1000069948.png` — 1536×864
- Fire: `1000069949.png` — 1536×864
- Air: `1000069950.png` — 1536×864
- Spirit: `1000069951.png` — 1536×864

These are the authoritative raster sheets referenced by the registry. The GitHub connector used for this recovery supports UTF-8 content writes but not binary PNG upload, so the source bytes remain external authority rather than being falsely represented by regenerated images.

## Earth-01 verification pass

Locked crop from the source registry: `[1130,125,1220,215]` (90×90).

Direct inspection of the recovered authoritative crop confirms:
- a central compass/star-like primitive structure with intentionally non-clean raster geometry;
- cardinal/diagonal linear structure;
- a dotted circular construction/ornamental guide surrounding the central form;
- the dotted circle overlaps the same locked crop and cannot be discarded as noise without semantic evidence.

Decision: **HOLD / needs-review**.

Earth-01 is not promoted. The primitive reconstruction route remains correct for the central structure, but exact-source policy forbids silently deleting the dotted circular material or guessing that it is non-glyph decoration. A canonical vector must preserve the intended source semantics, not merely produce a cleaner emblem.

This record is evidence of an actual source inspection, not a canonical lock.
