# Source study and decomposition of the current ornament

Review dated 10 October 2026. This expands the prior documented Krovets and Arab-Islamic source reviews and re-examines the sash paper and Met essays. Observed visual relationships, documented catalogue descriptions, mathematical constructions and new design decisions are distinguished below. No new trained model, complete museum-corpus analysis or historical hybrid pattern is claimed.

## Sources and transferable construction principles

| Source | What was examined | Construction principle | What should not be inferred |
|---|---|---|---|
| Nykorak, Herus and Kutsyr, Patterned Woven Sashes of Western Ukraine and Lithuania, 2022, pp.1147–1163, [DOI](https://doi.org/10.15407/nz2022.05.1147) | Paper text and illustrated bands; text revisited for motif and composition descriptions | Rhombus and half-rhombus combinations; hooked outlines; rosettes, crosses, pavuchky; related motifs at several scales; three/five/seven-part band hierarchies; alternation of filled and unfilled ground; tonal shimmer | Woven sash construction is not a machine embroidery recipe. Floral trees and detailed animals are not extracted from this paper merely because other sources have them |
| [Krovets kro-537](https://krovets.ua/item/kro-537), Poltava, Hadiatch, early twentieth century | Public title image and record | Fine stem hierarchy, differentiated flowers and light upper field | A flower is not merely a radial icon repeated unchanged |
| [Krovets kro-610](https://krovets.ua/item/kro-610), Poltava, first half twentieth century | Public image and record; tree-of-life/chain-stitch description | Dominant plant axis, secondary branches and blossoms at several scales | Record's chain stitch does not mean our tatami prototype reproduces its historical technique |
| [Krovets kro-613](https://krovets.ua/item/kro-613), Poltava ethnoregion, Pryluky, early twentieth century | Public image and record | Curled secondary stems, dense lower field, sustained relationships between plant and edge vines | Identical mirrored tiers alone do not reproduce this richness |
| [Krovets kro-517](https://krovets.ua/item/kro-517) | Public woven/geometric title image and record | Angular bird-like silhouettes and alternation of figure/diamond bands | Species identification is a visual interpretation, not an established catalogue label |
| [Krovets kro-575](https://krovets.ua/item/kro-575), [kro-576](https://krovets.ua/item/kro-576), [kro-608](https://krovets.ua/item/kro-608) | Public previews and records | Axial vase-like organisation, diagonal dense-to-sparse transitions and many narrow differentiated repeat rows | These observations do not constitute measured loom drafts |
| [Krovets kro-789](https://krovets.ua/item/kro-789), Eastern Podillia, inscription 1940 | Public rug title image and record, naturalistic roses | Shaded bouquet grouping, dark ground, several related flower tones, smaller edge flowers | Not evidence that all Ukrainian regions use the same plant grammar |
| [Krovets kro-793](https://krovets.ua/item/kro-793), Eastern Podillia, early twentieth century | Public geometricised floral rug image and record | Stepped flowers and angular leaves can provide an alternative counted botanical family | Organic and counted styles should remain separately selectable |
| [Met 31.119.1](https://www.metmuseum.org/art/collection/search/448652), ninth-century Iraq, probably Samarra, carved doors | Catalogue record and main object image | Paired bifurcating, curled abstract foliage; a continuous vegetal relationship rather than separate stickers | Carved architecture, not printed cloth; not permission to invent Arabic calligraphy |
| [Met 2016.624](https://www.metmuseum.org/art/collection/search/720594), thirteenth/fourteenth-century Egypt, Fustat, Ibex or Gazelle Block Print | Catalogue record and main image; description revisited | Readable animal silhouette, rising horn contour, large contrasted eye and diagonal chest marks | Print on paper, not textile. The catalogue's ibex/gazelle identification should not become a claim of species-identical generated geometry |
| [Met 52.20.21](https://www.metmuseum.org/art/collection/search/451101), Ottoman Turkey, ca.1565–80, wavy-vine textile | Record and main image | Broad continuous undulating stems, subordinate blossoms and articulated foliage | Ottoman Turkish textile is comparative Islamic evidence, not an Arabic regional attribution |
| [Met, Vegetal Patterns in Islamic Art](https://www.metmuseum.org/essays/vegetal-patterns-in-islamic-art) | Essay text revisited | Abstraction of inherited vegetal forms; combinations with geometry and figures; historically diverse regional traditions | The essay warns against generic symbolic interpretations. Do not assign invented meanings to every leaf or blossom |
| [Met, Geometric Patterns in Islamic Art](https://www.metmuseum.org/essays/geometric-patterns-in-islamic-art) | Essay read | Circles/interlaced circles, squares, stars and multisided polygons form repeat vocabularies through combination, duplication and interlace | Periodic Islamic star networks and Penrose substitution are distinct construction systems |
| [MathWorld, Penrose Tiles](https://mathworld.wolfram.com/PenroseTiles.html) | Construction and matching-condition description | Golden-ratio subdivision, finite sun patches and two Robinson triangle shapes | A finite triangular patch is not proof of all rhomb matching rules or infinite aperiodicity; historical plants are not thereby mathematical fractals |

The Krovets study covers 18 public title images and nine records, not the site's entire advertised collection. Subscription images were not accessed. Its public images are not embedded in the generator or repository. Egyptian textile fragments were also checked in the earlier review, but their degraded public images were unsuitable for inventing detailed reconstructed motifs. The existing Neon/corpus route is not used as a claim that a model was trained on all records.

## What is wrong with the former composition

Leaves were drawn after flower heads and some were positioned close enough to cover petals. Fixing only the drawing order would conceal the leaves but retain unnecessary hidden layers. The new composers defer foliage placement until all flower positions are known, omit leaves whose conservative bounding circles enter the flower clearance zone, then render the flowers in the foreground. The advanced design uses a 0.6-unit additional clearance in its 100 × 140 construction space. This is geometric clearance for the drawing, not calibrated thread clearance.

The three whorls made the flowers more intricate, but a large calyx, stacked petals, contours and veins could become many overlapping full fills if exported naively. Similarly, colouring all 890 Penrose triangles would waste thread under the plant. Finally, global colour sorting of original stacked objects can invert the apparent layer order. These are digitisation problems rather than evidence of an absent design engine.

## Decomposing the actual generated model

The reference guardian composition's 6,108 geometry objects partition into six disjoint roles; the analysis script fails if roles overlap or leave objects unclassified:

| Role | Objects | Breakdown and control |
|---|---:|---|
| Penrose field | 1,780 | 890 triangular fills + 890 edge paths; depth five. Shade fills remain in print, edges are visible-only running stitches in embroidery |
| Stem/scroll skeleton | 50 | Trunk, main branch curves, forks, scrolls and subordinate outer sprigs. Four branch tiers are a finite hierarchy |
| Leaves/veins | 364 | 28 retained leaf fills + 336 outline/spine/vein paths; conflicting leaves removed |
| Flower construction | 2,226 | Calyx, outer/middle/inner petal whorls, heart, stamens, rims and veins at crown, branch, axis, bud and scroll-terminal scales |
| Border/vessel | 1,588 | Two sinusoidal ribbons, alternating explicit crossing bridges, double rails, corner/edge rosettes, vase rim, medallion and handles |
| Animals | 100 | Independently drawn paired body/head silhouettes, legs, horn curves/ridges, eye/chest details and internal rosettes |

The flower can be understood as a parameterised assembly: centre → petal count and phase → outer calyx → three length-scaled whorls → vein paths → heart/stamens. The tree is root/vessel → axial trunk → branch tiers → forks/scrolls → retained leaves and flowers. The border is a pair of continuous ribbon curves plus a crossing schedule, not separate loops placed beside one another. The animal is a silhouette plus anatomical contour cues and interior decoration; it is not a traced museum animal. Layer-isolated SVGs and a breakdown.json are exported by scripts/analyze-symbiosis-patterns.ts.

## Which engines and models actually run

1. generatePatterns dispatches to the deterministic contemporary symbiosis composer. It obtains the botanical/source metadata, constructs the Penrose patch and independently drawn ornament, and applies the final SVG critic. This route does not run every optimisation/solver module in Tesseract.
2. Shared fill/path objects produce both the artwork SVG and its decomposition. Source IDs remain in metadata.
3. The embroidery compiler rasterises the resolved visible surface at 0.2 mm. It omits background shade tiles, identifies selected fine linework, and digitises only visible colour regions. It is not an AI image substitution or an automatically trained image-to-stitch model.
4. Visible fill rows respect holes and colour boundaries. Fine veins and Penrose edges are clipped to visible paths and use the existing running-stitch engine. Shared triangle edges are deduplicated into edge walks before visibility clipping, so the network is not double-sewn at every shared triangle boundary. Colour blocks, travel, locks, trims and final DST records supply real counts. Independent binary reading verifies DST and PES.

This first stitch route uses visible-mask tatami and running stitches, not material-optimised satin petals. It avoids stacked full hidden fills, but sampling and tie stitches still affect local density. It has no calibrated underlay or pull compensation, and some sub-resolution fragments may be omitted. The file is a concrete sew-out prototype rather than a validated production pattern.

## What greater sophistication should mean next

The useful improvements from the sources are structural: redistribute flower sizes and voids, vary branch junctions and blossom orientation, use broad and fine foliage in a deliberate hierarchy, build distinct terminal/corner solutions, and let the border cadence respond to the central plant. Merely adding subdivisions, more petals or additional colour layers increases stitches without necessarily improving the design.

For embroidery, those choices need minimum-feature limits derived from a chosen needle/thread/fabric and measured sample. Wide petals can then receive directional tatami, narrow petals satin, fine outlines running/bean stitch and broad stems suitable underlay. Production optimisation should honour motif dependencies and clearance, rather than freely regroup overlapping layers by colour. The current files establish real geometry, countable commands and machine-profile checks; they do not claim that this material-dependent optimisation has already been completed.
