# Applying the supplied sash study

Read from the user's uploaded PDF, 10 October 2026. Olena Nykorak, Lyudmyla Herus and Tetiana Kutsyr, *Patterned Woven Sashes of Western Ukraine and Lithuania: Techniques, Ornamentation, Functions*, 2022, pp. 1147–1163. DOI: https://doi.org/10.15407/nz2022.05.1147. Page numbers below are the printed journal pages, not PDF indices. Text and illustrated pages were examined; no figure or object geometry was traced.

## Source observations and implementation

| Source | Observation, paraphrased | Implementation |
|---|---|---|
| p. 1153, figs. 2–6 | The examined Ukrainian examples favour ordered rhythm and reflection across their principal axes. Single-motif rows with narrow framing are a simple, relatively uncommon arrangement. | Retain the single-row option; use a three-band composition as the Studio default. |
| p. 1154, figs. 7–8 | Multiple patterned strips may have contrasting narrow separators; motif scale changes with strip width. Diamond and oblique-cross alternation appears in Western Ukrainian examples. | Paired miniature diamond-derived flank rows around a larger central row. No claim that our present stepped-cross family reproduces the documented diamond/oblique-cross alternation. |
| p. 1155 | Hutsul examples include three divisions and, less commonly, five, with longitudinal rows and narrow coloured or patterned separators. Dark grounds can bind the colours together. | Three- and five-band controls, continuous dark grounds and separating bars. |
| p. 1156 | Multi-motif Ukrainian sashes commonly have three symmetrical strips; five or seven also occur. More complex, larger motifs occupy the middle. | Three/five arrangements have one taller main strip and smaller, paired flanks. Seven-strip mode is not implemented. |
| pp. 1157–1158, figs. 13–14 | Smaller related border motifs reinforce the main pattern. Double arrangements can unite partial motifs into complete units. | Related subsidiary diamonds are repeated within the main period. Joined-half/double construction is a further grammar, not claimed by these layouts. |

The paper distinguishes these Ukrainian constructions from several Lithuanian tendencies. Diagonal arrangements, cropped motifs and sequential non-repeating motifs must not be treated as interchangeable defaults for the Ukrainian mode. These are descriptions of the authors' examined material, not absolute rules covering every object or region.

## What the study does not measure

The existing `sash-evidence-grammar.ts` cites this paper while assigning numerical symmetry, central-width, alternation and contrast weights. The article does not publish those numerical coefficients. They are now explicitly labelled implementation heuristics and associated with page references.

Our 35/65/87-row grids, strip heights, palette hex values, repeat limits and millimetre dimensions are also design choices. They are not measurements extracted from the article. Composition citations travel with the generated SVG metadata and fill-plan export. The original Neon image remains separately attributed.

## Medium and validation

The reference is about woven sashes. The app uses its composition hierarchy to create new counted-grid ornament layouts that may later be adapted for embroidery. SVG and fill IR are design geometry; neither is a loom draft. A woven version needs warp/weft structure, float control, yarn and sett. An embroidered version needs digitisation and a physical sew-out.

The CLI exports nine designs: three motif families in one-, three- and five-band arrangements. Tests verify reflected grid rows, subordinate flank scale, coordinate bounds, provenance and agreement between SVG and fill IR. No production-readiness or traditional-authenticity score is assigned.

## Dense-field revision

Following visual feedback that the generated bands were empty, the renderer now fills the chosen artwork extent rather than letterboxing a square-cell grid. Cell width and height are recorded independently; changing repeat count can stretch the cells, so these remain design layouts rather than a measured counted-thread draft.

Boundary-centred miniature diamonds and oblique-cross interiors occupy the interstitial field between principal figures. Subsidiary panels and separator rows are patterned throughout, with no transparent gutters. These are new constructions informed by the relationships described on pp. 1154–1158, not traced historical figures.

The Studio reports ornament-cell coverage separately from ink coverage: a plain black background no longer makes the ornament-density figure look high. Regression checks cover all three families, all supported band counts and low/high repeat settings, verifying full bounds and more than half the cells carrying ornament colour rather than the dark ground.

## More detailed construction families

The hooked-medallion and joined-diamond-network families use a 49-cell horizontal unit and a 45-row main panel, allowing several nested outlines and subdivisions. These dimensions are implementation choices. The medallion divides into four smaller diamond figures with turned-in orthogonal hooks around the interior. The network joins paired half-motifs across the main panel axis. Both use smaller related diamond figures in flanking bands, patterned separators and interstitial figures.

These are new constructions informed by the descriptions and illustrated relationships on pp. 1157–1158 (figs. 13–14), not reconstructions traced from a museum object. The Studio opens the hooked-medallion family, supports all five families, and the real engine CLI exports each in one-, three- and five-band compositions (15 designs). Seed changes can alter internal line construction for hooked medallions as well as colours; they do not constitute learned historical variation.
