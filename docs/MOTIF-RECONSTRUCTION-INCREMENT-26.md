# Increment 26 — connect the stored grammar to the existing engines

Branch: `codex/motif-graph-reconstruction`. State: REFERENCE / prototype.

## Implemented behavior

The studio now defaults to the actual existing Lego composition and stitch-planning path. It uses a pinned read-only snapshot of Neon's `tesseract-learned-latest`, version `tesseract-learned/0.3-lego`, built 2026-10-13 13:15 UTC, scoped to the Ukrainian grammar bucket. No database rows were written, no model was promoted and no new training was performed.

The snapshot includes motif frequency weights, neighbour counts/relative sizes, mirror statistics and repeat statistics. Its `images: 1919` is a stored model statistic, not an independently audited count of distinct, permission-verified training images. Regional identity, botanical identity and cultural meaning are not validated by automatic brick classification. Dataset source-rights review remains pending; roughly half the model's Ukrainian classified-piece share is marked novel by its stored statistics.

`planBand` and `composeBand` reuse `BRICKS`, `Kit` and their existing authored roses, leaves, buds, trees, birds, lilies, scrolls and medallions. Learned frequencies and pair counts influence family/companion selection; pair relative size and vertical offset influence layout. The current composer does not use the stored horizontal offsets or repeat frequencies directly. Motif geometry is the existing authored vocabulary, not learned historical contours. A user may explicitly choose a main motif; the learned companion selection remains active.

Connected composition adds an authored vine and root connectors at actual hero geometry points. The bridge rejects ports off their owning paths, retains explicit junctions and groups frame, hero, companion, filler and connection objects into typed motif assemblies. It reuses Tesseract graph validation, structure measurement and `planEmbroideryJob`, then the existing stitch engine's material recipe, `plan`, `previewSvg` and `runGate`.

The UI supports main-motif selection, exploration of pairings, reference machine field selection, actual calculated stitch counts, a stitch preview and stitch-preview SVG export. A selected oversized machine field is shown as a blocker. Source-jigsaw, authored-study and canonical views remain separate alternatives. The model snapshot is a separate 22.99 KB asset; credentials are not shipped to the browser.

## Fixes and compatibility

- A forced minimum of two repeats could exceed available band width. The composer now permits one and constrains hero/companion sizes to the available width.
- Filler motifs centred at the first band edge extended outside the canvas. Fillers now occupy internal repeat boundaries only; a single-unit band has no such filler.
- Border satins now have an inset; the final rhomb row does not add a partial unit outside non-multiple-of-five widths.
- The connecting vine is placed clear of the lowest motif bases; the reviewed benchmark cases pass the geometric stitch gate apart from the unvalidated recipe.
- `check.ts` now imports the actual engine analyser instead of the CommonJS compatibility re-export, resolving the Node/tsx named-export failure.
- Two existing tuple-index type errors and validated-index annotations were corrected for the blend engine's stricter TypeScript settings. Unknown canonical form lookup now explicitly returns undefined; canonical paths were not changed.
- Web TypeScript permits source `.ts` imports with no emit, as required by the existing blend/stitch modules.

## Evidence

`npm run benchmark:motif:learned` reproduces the stored-snapshot designs, graphs, SVGs, stitch previews and report under `data/research/motif-benchmarks/learned-runtime-v1/`.

| Case | Main motif and companion | Calculated prototype stitches |
| --- | --- | ---: |
| auto seed 0 | paired scrolls + bird | 8,604 |
| tree seed 1 | tree + bird | 8,402 |
| rose seed 2 | layered flower + star-lily | 14,934 |
| medallion seed 3 | medallion + paired scrolls | 8,401 |

These four generated cases have no object-envelope errors and no broken declared junctions. Their stitch gate retains `recipe-validated: false`. Without a selected machine, machine selection also remains pending; source-rights review is an additional release blocker.

The new regression tests demonstrate that changing stored `horns|lily` neighbour counts changes the selected companion and SVG. They also check deterministic vector/stitch regeneration, the actual command-derived stitch count, full assembly ownership, canonical registry immutability, source-code hash, off-path port rejection, canvas fit, an oversized selected-machine blocker and unchanged false production approval.

## Remaining limits

This is statistical grammar-driven composition with authored vector parts. It is not new neural training, automatic historic petal/stem decomposition, learned contour synthesis, complete internal attachment annotation or verified sophisticated aesthetics. The new explicit graph contacts cover hero roots/connectors/vine; internal Kit geometry still needs a richer attachment graph. Primitive aspect estimates and gap correction are heuristic; arbitrary parameter combinations may still fail checks, which remain visible.

No Arabic/Penrose training is applied to this Ukrainian-scoped model. There is no training-dataset rights audit, expert cultural review, physically validated material recipe, garment-access check or sew-out approval. No production machine file is released and no production deployment is performed. Passing digital geometry and stitch checks does not remove those blockers.

## Verification commands and results

- Tesseract typecheck/build, 53 test files / 189 tests and existing reference pilot passed. The pilot still reports missing-machine/reference-pattern blockers and false production approval.
- Blend-engine typecheck and all 7 tests passed. After final assembly grouping and fractional-width handling, the 3 integration regressions passed again.
- Stitch-engine typecheck and all 22 tests passed.
- Web TypeScript/Vite build passed. The existing bundle-size warning remains (about 1.36 MB before gzip); code splitting is incomplete.
- Playwright against the built app confirmed the stored-grammar default, no source images in generated SVG, displayed command-derived stitch counts, changed seed, tree/rose selection, selected-machine field checking, stitch preview, stitch-preview download, visible oversize blocker, no page errors and no mobile overflow at 390px. Screenshots/results are retained with the benchmark.

The frozen grammar is an inspected database artifact. These checks establish that its statistics reach the running composer; they do not validate the corpus labels or establish historical reconstruction quality.
