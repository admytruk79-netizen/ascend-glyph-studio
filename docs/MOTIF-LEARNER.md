# Motif learner: learning counted Ukrainian motifs and generating new ones

`packages/motif-learner` learns how counted-thread motifs are built from charts or flat photographs. It then generates new motifs that follow that construction without copying any of them. It outputs a counted chart, an SVG preview, a band, and stitch-engine paths for a DST file.

It sits beside the existing engines and does not replace them. It works on the counted grid, where Ukrainian cross-stitch (хрестик), набирування and низь are actually made.

## How existing engines do it

### In this repository

| Engine | What it does | What it does not do |
| --- | --- | --- |
| `scripts/train/train-tesseract.mts` (daily full-corpus run) | Frozen CLIP filters and tags museum images. It also takes thread palettes, clusters motif outlines into a codebook of *averaged* radial profiles, and collects Lego neighbour/repeat statistics. Run #20 on 12 Oct kept 22,656 of 63,030 images. | Averaging outlines loses holes, petals, diagonals and openwork. Promotion compares image counts, not quality on held-out data. Inference averages traditions together (see the audit in `docs/TESSERACT-TRAINING-OPTIONS-AND-COMPARATORS.md`, branch `codex/motif-graph-reconstruction`). |
| `packages/blend-engine` | Hand-written motifs (`folk-rich.ts`) are placed by tradition weights into the 7 frieze groups, with priors from the literature. | Nothing about how a motif is built is learned. The motifs are authored by hand. |
| `scripts/train/lego.ts` | Matches image parts to existing bricks and records the distances between nearby bricks. | Nearest neighbours are not real construction relations. |
| MotifGraph reconstruction (`codex/motif-graph-reconstruction`) | A typed part hierarchy with ports, built by hand annotation and deterministic reconstruction. | Its own audit says nothing is fitted or evaluated yet. |

### Outside the repository

| Approach | How it works | Fit for counted embroidery |
| --- | --- | --- |
| [Wave Function Collapse, overlapping model](https://github.com/mxgmn/WaveFunctionCollapse) | Counts every N×N patch in an example bitmap. Fills an output so that each window is one it has seen, collapsing the cell with the lowest entropy first. | Very close to counted work, but the patch rules are hard allow/deny. It can contradict itself, needs large varied examples ([Tessera notes](https://www.boristhebrave.com/docs/tessera/6/articles/overlapping.html)), and gives no likelihood to evaluate or rank with. |
| Diffusion / GAN pattern models ([Dunhuang DANet](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12111379/), [SegCycle-SPADE](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12626277/), [Structured Pattern Expansion](https://arxiv.org/html/2411.08930v1)) | Image models trained or adapted on thousands of pattern images. | Output is pixels, not counted cells. Exact symmetry, stitch counts and machine paths are not guaranteed, and there is no copy check against the training motifs. |
| Midjourney / Stable Diffusion for vyshyvanka ([C²DH VYSH project](https://www.uni.lu/c2dh-en/articles/ai-generated-embroideries-for-ukrainian-dancing-costumes/)), [VyshyvAI](https://rubryka.com/en/2024/07/31/personalizovanyh-vyshyvanok-za-dopomogoyu-shi/) | General image generators prompted for Ukrainian embroidery; VyshyvAI does not say what its algorithm is. | The C²DH team still had to convert results by hand for an embroidery machine. No provenance, no held-out evaluation. |
| Shape grammar + style transfer (Miao cross-stitch study, 2020) | Hand-written rules plus neural style transfer. | The rules are written by hand, not learned. |
| Digitizers: Ink/Stitch, Wilcom, Hatch, Embird | Turn artwork into stitches. | They do not learn or generate motifs. |

## What is new here

1. **Learned local construction, kept as probabilities.** Like WFC it counts 3×3 neighbourhoods of stitched and bare cells (all 8 rotations/reflections). But it stores smoothed probabilities, not allow/deny rules. That gives a real likelihood: every motif can be scored, ranked and evaluated.
2. **Generation that keeps the tradition's whole mix.** Simply picking the most likely texture collapsed every motif into a solid blob (first attempt). The sampler instead minimises the KL divergence between the motif's own 3×3 histogram and the learned one. Lines, diagonals, corners, voids and fills all appear in the learned proportions. This is the main improvement over both WFC and the averaged-outline codebook.
3. **Exact symmetry by construction.** It samples whole orbits of cells under the group (d4, c4, d2, c2, mirror), chosen from the learned symmetry mix. Detection reads the same groups back from imperfect real charts, with a tolerance.
4. **Learned colour structure.** Thread choice depends on the ring layer from centre to edge and on how often touching stitches share a thread. That is how it learned black frames around red interiors from the seed charts without being told.
5. **Held-out evaluation against a baseline.** Leave-one-source-group-out: refit without the group, then score its motifs against an independent-cell model. Groups (object, book, chart author) never straddle the split.
6. **Fail-closed admission** (fixes item 1 of the audit). An unknown licence, `review` or `restricted` is excluded. `structure-only` material trains shape but never colour.
7. **No pooling** (fixes item 5 of the audit). Each tradition, and each documented region with at least 5 examples, has its own fit. An untrained tradition is an error, never a silent average.
8. **Near-copy and plausibility gates.** Each candidate is compared with every training motif, under all 8 rotations/reflections. A shape overlap of 80% or more is rejected. So is any candidate whose local construction scores worse than the weaker training motifs. Every candidate records its lineage: model, dataset hash and references.
9. **Straight to production geometry.** One path per same-thread row run, in the Danish method ("/" legs out, "\" legs back). Paths go into `stitch-engine` planning, the gate and DST output.
10. **Image → grid.** Stitch pitch comes from the autocorrelation of edge energy, using the fundamental rather than a multiple. Colour comes from cell medians, k-means and the nearest thread. It returns nothing when no clear pitch exists (fail closed).

## Fractal motifs with decoration (`src/fractal.ts`)

Many Ukrainian motifs repeat themselves at two or three scales: an eight-pointed star is built from rhombs, a rhomb is filled with small rhombs, a band repeats the motif along a sleeve. That is fractal-*like* over a few levels, not an infinite fractal. Nothing documents that embroiderers worked with fractals as an idea, so the engine measures this rather than assuming it.

- **Self-similar composition.** A generated layout motif (open, branching) is filled with a generated element motif (compact, d4). Each stitched layout cell becomes one element, set one thread apart, and the element's main thread takes the layout cell's thread. Both levels come from the same learned construction model.
- **Decoration.** The decorative vocabulary is learned: the small separate islands (≤ 6 stitches) in the training motifs, with their frequencies (on the seed set: single dots and three-stitch rays). One decoration is placed beyond each branch end of the layout. A closed layout uses its outermost point in each of the 8 directions instead. The decoration layer is then repeated over the symmetry group, so symmetry stays exact.
- **Measured fractality.** Box-counting dimension is computed for every training motif (seed set: 0.77 ram's horns to 1.36 rose and sown rhomb). Each fractal candidate reports its own dimension against that range. A sample run gave 0.92–1.24, inside the range, with ≤ 10% shape overlap with any training motif.

```bash
npm --workspace @ascend/motif-learner run generate -- --fractal --count 6 --seed 101   # → out/motif-learner/fractal-sheet.svg
```

Sample: `docs/images/motif-learner-fractal-sample.svg`. Fractal motifs are large: 37–63 cells across, which is 74–126 mm at 2 mm pitch. They suit chest, yoke and towel-end fields, not cuffs.

## Amalgamating traditions (`src/blend.ts`)

Each tradition is fitted on its own and never pooled. A blend is built at request time from several fitted traditions, so the generator can make motifs that carry more than one, for example Ukrainian with English samplers or Palestinian tatreez.

- **`mix` mode:** the local construction model is a weighted mixture. A motif may use any parent's ways of building, such as Ukrainian diagonals beside English stepped borders.
- **`common` mode:** a weighted geometric mean. Only constructions that are plausible in every parent survive, which is the ground the traditions share.
- **Colour:** taken from one named parent (structure from one tradition, palette from another) or mixed by weight.
- **Gates:** every parent's references stay in the near-copy check, so a blend copies none of them. Each candidate can be scored against each parent (`parentFit`) to show how much of each tradition it carries.

In the test, a 50/50 blend of the Ukrainian seed charts and a lattice tradition produces motifs whose fit sits between the two pure traditions, as intended.

```bash
npm --workspace @ascend/motif-learner run generate -- --blend Ukrainian=0.6,English=0.4 [--mode mix|common] [--colour-from English]
```

A blend needs a second trained tradition. Only Ukrainian has reviewed records so far; English samplers and tatreez are the next collections. Generated blends should be labelled as fusions inspired by each tradition, not as authentic work of either.

## Shape grammar: how motifs are drawn (`src/grammar.ts`)

Drawing cell by cell from 3×3 patch statistics (simulated annealing, still available with `--anneal`) gave ragged blobs with stubs, and an invented style gave noise. Generators whose output looks right work differently. [Hoopla](https://coding-crafter.itch.io/hoopla), a procedural cross-stitch sampler, builds a motif from clean primitives. So do the shape grammars for blackwork ([ICCC 2017](https://computationalcreativity.net/iccc2017/CCW/CCW2017_paper_2.pdf)) and design motifs ([Mazeika & Whitehead](https://www.pcgworkshop.com/archive/mazeika2015motifs.pdf)). Systems built on image models (VyshyvAI, the C²DH VYSH project) cannot be counted or stitched without redrawing. So the generator now runs a small grammar, and the learned model judges what it draws:

- **Primitives:** all built on 45° geometry:
  - filled, outlined, stepped (2×2) and nested rhombs;
  - eight-point stars, both as square-over-rhomb and as eight rhomb petals;
  - toothed rings, diagonal arms with sprouts, ram's horns and hooks, fir arms, satellites, corner rhombs and frames.
- **Figurative family** (one mirror): a pot or roots, a trunk, and paired branches with leaves, ending in tulips, carnations, rhombs or petal stars, with a crowning flower. These are the tree-of-life and vase motifs of both Ukrainian work and samplers.
- **Composition:** core, then rings, arms and satellites, scaled to the motif radius. Each part is painted in a colour role (fill, outline, accent, leaf) with a one-cell halo, so parts stay separate. Symmetry is exact, because every part is copied under the group (d4, c4, d2 or one mirror).
- **Style profiles:**
  - each tradition has a profile: how often it draws figurative motifs, and which cores, arms and flowers it favours;
  - the Ukrainian and English profiles are written from the pattern literature, so they are priors, not learned;
  - a blend mixes its parents' profiles by weight, and an invented style draws a profile of its own.
- **What the model decides:**
  - the palette comes from thread use;
  - for each motif, 10 programs are drawn and ranked by looks (density near the style's, several parts, no big solid blocks, no stray stitches) plus a nudge from the patch log-likelihood;
  - the near-copy gate (IoU < 0.8 over all 8 rotations and reflections) still applies.
- **Family choice:** figurative or geometric is chosen before ranking and is stratified. Over a run, the share of figurative motifs matches the style's rate, and the ranking cannot favour one family.
- **Learning from ratings (`learnStyle`):**
  - every motif records its traits: family, symmetry, core, arm and flowers;
  - on the engine page each generated motif has Like and Not this buttons, and the ratings are kept in the page's database;
  - before each batch, the style's profile is moved towards what was liked. The base profile counts as 4 ratings; a like adds 1 to each of the motif's traits, and a "Not this" takes away half of one;
  - no weight falls below a twentieth of its share, so a disliked shape becomes rare but never impossible;
  - in a test through the browser bundle, 6 liked trees and 2 rejected nested-rhomb motifs took Ukrainian from 8 trees in 40 to 34, and from 2 nested rhombs to 0.

## Results now (honest scope)

On the 10 bundled seed charts (`data/motifs/ua-seed-motifs.v1.json`):

- **Held out:** the learned model beats the independent-cell baseline on 10/10 motifs, by a mean of +0.99 nats per window (range +0.55 nested rhombs to +1.40 oak leaf).
- **Generation** (seed 11): 13 tried, 12 accepted, 1 rejected by a gate. The accepted candidates' largest shape overlap with any training motif was 22–46%; the near-copy limit is 80%. Sample: `docs/images/motif-learner-sample.svg`.
- **Stitch engine:** a generated motif at 2 mm pitch passes every check (stitch length, gaps, hoop, budgets). The only failure is `recipe-validated`, because no sew-out exists yet (prototype).
- **Tests:** 13 tests, all passing (`npm --workspace @ascend/motif-learner test`).

**Limits.** The seed charts were drawn in this repository as generic counted versions of widely documented forms: star, sown-field rhomb, sun, rose, ram's horns, fir, tulip, kalyna, oak. They are **not** traced from museum objects and count as **0 independent historical sources**. The evaluation report says so. This shows the method works. It does not show the model has learned Ukrainian embroidery. That needs real, permission-reviewed charts (the audit suggests 30–50 independent objects for a narrow pilot), ideally grouped by documented region.

Other limits:

- The 3×3 model has no long-range structure beyond symmetry, density and island count. The grammar now supplies that structure, so its vocabulary limits what can be drawn. Its style profiles are hand-written priors until enough reviewed charts exist to fit them.
- Bands are composed by a grammar string, not learned.
- Cross-stitch paths are geometry-checked only. Pitch, pull and coverage need the calibration sew-out.
- Image extraction works for charts and flat, square-on photos. Worn, curved or angled garments will often fail, and are then excluded.

## Use

```bash
npm --workspace @ascend/motif-learner run train                    # fit + held-out evaluation → out/motif-learner/
npm --workspace @ascend/motif-learner run generate -- --count 12 --seed 11 [--group d4|c4|d2|mirror-v] [--size 27] [--region R] [--anneal]
npx tsx packages/motif-learner/src/cli.ts extract chart.jpg --id met-12345 --tradition Ukrainian --group met-12345
```

`extract` prints a record with `licence: "unreviewed"` and `culturalAccess: "review"`, so it is excluded until a person fills in the real licence, access and documented region. Add reviewed records to a JSON file under `data/motifs/` (schema `ascend.motif-records.v1`) and retrain.

## Next steps

1. Run `extract` on the permitted counted charts and flat photographs already found (Met Open Access objects, the 1902 plates once rights are confirmed, Oleksandr's own charts). Review each record, then retrain. Watch the held-out gain and how many independent sources the evaluation reports.
2. Add a 5×5 or two-scale patch model once there is enough data: held-out gain will show whether it helps.
3. Learn band grammar (repeat period, event spacing, rails) from charted borders.
4. Run the learner's motifs through the human preference ranker (`scripts/train/preference-model.mts`).
5. Sew the calibration strip, so cross-stitch pitch and pull can be set per fabric.
