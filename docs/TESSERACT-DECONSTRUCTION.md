# Tesseract corpus: master store and pattern deconstruction

This document covers steps 1–3 of the training pipeline: one growing corpus, finding the repeat, and classifying the symmetry. The project description (`docs/ASCEND-TESSERACT-PROJECT.md`, §3–4) asks one question of every image: **how is this pattern constructed?** These steps answer it with structure, not copied motifs.

## Pipeline (`.github/workflows/corpus-harvest.yml`)

1. **Harvest** (`scripts/build-research-corpus.ts`) enumerates open-access museum and Commons records and applies the metadata gates: image, provenance, rights, cultural access and relevance.
2. **Queue** (`scripts/prepare-analysis-queue.ts`) builds the list of images to analyse:
   - new candidates that aren't in the master yet;
   - master rows analysed by an older analyzer version, so they get upgraded.
3. **Analyze** (`scripts/analyze-research-corpus.ts`) downloads each image, measures its structural features and runs the deconstruction. Images are analysed in memory and never stored.
4. **Merge** (`scripts/merge-research-corpus.ts`, `scripts/corpus/store.ts`) adds the results to the master corpus:
   - duplicates are removed by id, image URL and a 128-bit perceptual hash;
   - re-analysed rows replace their older versions;
   - stable splits are assigned;
   - coverage stats are written.

   The master is published as the `tesseract-master` artifact. The next run downloads it and continues from there.

## Splits

Splits are 80% train, 10% validation and 10% holdout. They're assigned by hashing a **group key**: source plus accession series. For example, `1916.123` and `1916.456` both belong to series `1916`. Objects from the same series always land in the same split, so the holdout set never leaks related objects. Assignment is deterministic, so a row keeps its split as the corpus grows.

## Coverage stats (`master-stats.json`)

- Total analysed instances, milestone progress (25k → 100k → 250k → 500k → 750k) and counts per split.
- Counts per source, per tradition and per structural kind.
- Frieze-group and wallpaper/rosette distributions.
- The v3 diversity checks:
  - no tradition over 2%;
  - no source over 5%;
  - at least 300 traditions;
  - at least 250 independent source groups.

## Deconstruction (`scripts/corpus/deconstruct.ts`)

| Function | Output |
|---|---|
| `cropPatternRegion` | Box around the ornamented object against the museum backdrop (adaptive threshold) |
| `detectBands` | Border bands (horizontal or vertical strips whose content repeats along the strip), with fractional period |
| `findRepeatUnit` | `none` / `1d` (repeat in one direction only) / `lattice` (two translation vectors) with lattice type: oblique, rectangular, rhombic, square or hexagonal |
| `classifyFriezeGroup` | One of the 7 frieze groups: `p1`, `p11m`, `p1m1`, `p11g`, `p2`, `p2mg`, `p2mm` |
| `classifyWallpaperGroup` | Rotation order (1/2/3/4/6), mirror-or-glide presence and the candidate wallpaper groups consistent with them |
| `classifyRosette` | Point symmetry of a single motif: cyclic `Cn` or dihedral `Dn` |
| `detectBreaks` | Where a band departs from its own repeat: interruption, void, variation |
| `toGrammar` | The ASCEND pattern sentence (`AAAA \| B \| AAA`, `ABAB`, `ABCBA`, `A → A′ → A″`, `[VOID]`) and its figures: continuity, event, duality, return, development, passage |
| `measureScaleLevels` | Stitch, motif, band and field scale relative to the region (S1–S5) |

Symmetry is tested by correlating the pattern with its own flips and rotations, allowing for a translation. That way a mirror or rotation that only holds up to a shift is still found. Bands are measured on a finer raster (512 px) than the whole-field analysis (128 px), so small border motifs keep their detail.

### Known limits

- **Wallpaper groups:** mirror and glide aren't separated yet, so results are reported as candidates (for example `pmm/pmg/pgg`).
- **Photographs:** folds, perspective and wear lower symmetry scores. Results are evidence for structural learning, not ground truth.
- **Labelled examples:** 1,000–5,000 human-labelled images are needed to measure accuracy. That's step 7 in the build plan.
