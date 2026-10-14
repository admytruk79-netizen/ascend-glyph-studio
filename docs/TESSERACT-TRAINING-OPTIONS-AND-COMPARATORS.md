# Training Tesseract: practical approaches, data and comparators

Training means fitting model parameters from examples, then measuring whether the fitted model improves on independent examples. It does not mean collecting references, computing a mask, running a pretrained encoder, adding a hand-written generation rule, or preserving hand-annotated coordinates in a reconstruction.

Tesseract should remain a constrained assembly/compiler engine. Train specific perception, construction-prior and preference components around it; retain immutable canonical ASCEND geometry and deterministic manufacturing gates. The recommended first route is human-reviewed decomposition plus small conditional graph/grammar priors, with pretrained vision helping annotation. A new image generator trained from scratch is not the first useful step.

This report is based on local code inspection, six hash-checked retained reference images from five independent objects, current public tool/model documentation and the earlier source research. No trainer was executed, model weights installed, external competitor benchmarked, or database/model record written. Evidence URLs, hashes and code fingerprints are retained in data/research/motif-annotations/tesseract-training-options-research.json.

## What already exists and what it actually learns

| Component | Existing behaviour | Reuse and limitation |
| --- | --- | --- |
| scripts/train/train-tesseract.mts | Applies frozen CLIP to image filtering/tagging, extracts palettes and foreground components, clusters descriptors, averages outline profiles and aggregates Lego pair/repeat statistics | Statistical fitting exists; this script does not fine-tune CLIP or learn the new typed MotifGraph hierarchy, ports and reference reconstructions. |
| scripts/train/learn.ts → engine raster-features.ts | Palette clustering, connected components, radial/shape descriptors and prototype outlines | Reuse for coarse baselines. A connected plant may become one component; averaged radial profiles cannot preserve every hole, concavity, petal group or contact. |
| scripts/train/lego.ts | Matches components to existing blend-engine bricks; collects three-nearest-neighbour offsets and horizontal repeat statistics | Reuse as a measurable baseline, not ground truth. Nearest neighbours are not semantic branch attachments or spatial nests. |
| scripts/run-tesseract-worker.ts | Converts aggregated model statistics into palette/density/relation guidance | Reuse the integration point, but choose source/medium/family-conditioned guidance rather than pooling all traditions. |
| scripts/train/preference-model.mts | Fits logistic weights to pairwise design choices | Reuse the feature/ranking framework after adding independent evaluation and pair-order consistency. The current reported accuracy/loss are calculated on training pairs; its eight-pair entry threshold is not evidence of reliable generalisation. |
| production-learning.ts | Conservatively adjusts limits from statuses marked measured/reviewed/production-validated | Reuse physical feedback, conditioned on machine, fabric, thread, hoop and stitch recipe. The function itself filters medium/status, so an appropriately filtered provider is necessary to avoid transferring evidence between incompatible setups. |
| MotifGraph, observed annotations, reconstruction, profiles, region/field layouts, clearance and production compiler | Typed reference hierarchy, explicit ports, nesting/repeat checks, deterministic generation and manufacturing rejection | Preserve these. Predict candidate structures into the schema and reject invalid ones; do not train a model to silently deform canonical glyphs or override a machine limit. |

The presence of training scripts, schedules or existing database model rows is not proof of a successful or high-quality training run. Current remote runs and active Neon model contents were not audited in this research task.

### Confirmed problems to address before a new run

1. **Training-source permission is not selected/audited.** The Neon records query does not select image rights/licence evidence and defaults missing cultural access to open. Eligibility needs an explicit, fail-closed training manifest; analysis or reconstruction provenance is not itself an explicit training record.
2. **The earlier Commons attribution guard can be bypassed by the loader.** traditionOf suppresses legacy query-injected country labels when source=commons. The Neon training SELECT omits source. A synthetic row named Rose Wreath (Cooper Hewitt), carrying the old Ukrainian/Ukraine query metadata, returns Other with source present but Ukrainian when source is omitted. This counterexample was executed locally; it is not a new database audit.
3. **Region mapping is coarse and mixes geography with attribution.** regionOf maps Житомирське Полісся to Volyn–Polissia. It cannot preserve the ten documented regional distinctions in the recent shirt study. It also reads free-text location terms; a museum location must not become the object's ethnographic region.
4. **Model promotion is based on counts, not held-out reconstruction quality.** The current checkpoint logic compares image/tradition/pair counts with the active model. A holdout fingerprint is recorded, but those checks do not measure holdout accuracy. First-model promotion can pass without a baseline-quality comparison.
5. **Inference pools distinct traditions.** loadLearnedGuidance averages palettes/tags/density across model traditions and uses lego.all for relation priors. That can obscure attribution and structural differences even when extraction groups are separate.
6. **Evaluation must detect actual structural failure.** Existing coordinate-preservation/mask-round-trip benchmarks remain useful implementation tests, but cannot establish semantic decomposition accuracy or model generalisation.

These findings are documented, not fixed by this research increment. Do not launch the full-corpus workflow as a substitute for resolving them.

## Sources that can support training

| Source | Appropriate use | Current evidence |
| --- | --- | --- |
| Met Open Access public-domain images and historical pattern plates | Permitted image/mask/vector/graph annotation candidates, subject to item-specific provenance | Three independent Met objects are retained locally: 239343, 445264 and 445265. Other retrieved historical Met records 357206 and 388374 report public domain. Separate embroidery, woven textiles and printed designs instead of pooling them as the same medium. |
| Other museum CC0/open collections | Broaden independent artists/objects and structural families | Check each image's rights, attribution and access rather than treating an entire museum as one blanket licence. Cleveland plate 1993.114 has a retained Archive CC0 declaration; fresh official API verification failed, so it remains a conditional candidate here. |
| Ukrainian ornament plates 27/37, published 1902, retained through Neon/Commons | Potential reference and future training candidates for broad Ukrainian ornament | Existing admission is a qualified US reference-use assessment using per-item public-domain metadata. No fresh Commons licence refresh, worldwide training assessment or regional attribution is established. These two sources are not already a reviewed regional training dataset. |
| Original user-owned drawings/photographs with appropriate rights and documented context | High-value paired examples, including exact vector/graph ground truth | Verify ownership/permission for the actual work and image. Uploading a third-party book is not evidence that its images can be included in commercial training. |
| Repository-authored synthetic MotifGraphs and canonical assemblies | Unlimited structural controls, ports, repeats, nesting, collision and perturbation examples | Useful for learning/validating graph syntax and constraints. Synthetic variants are not independent historical sources or proof of cultural authenticity. |
| Human-reviewed candidate preferences | Train a ranker against the user's design choices | Collect choices with reasons such as poor flower/leaf overlap, repeated basic forms, weak hierarchy or excessive empty space. Keep evaluation designs independent of training choices. |
| Measured physical sew-outs | Learn machine/material/process corrections | No audited real sew-out dataset was established in this task. Digital contours, simulated stitches and manufacturer maxima are not physical training labels. |
| Krovets, Vytvory and Honchar charts examined so far | Research/annotation-method references; identify which additional data to license | Krovets public photos are CC BY-NC-ND and other images are personal/noncommercial. Honchar PDFs explicitly prohibit commercial use. Vytvory is a design/placement reference, not a freely licensed image dataset. Do not include them in commercial motif training by default. |

The current retained fixtures comprise **five independent objects**, not six independent sources: one Met object has both web-size and original images. Crops, alternate photographs, resized files, reconstructed parts and synthetic perturbations must not inflate independent-source counts. Most current annotations are draft and partial. There is enough for baseline demonstrations, not enough to claim robust regional motif learning.

The broader Neon corpus is a source-discovery pool, not an automatically eligible training set. Earlier study found false cultural attribution and machine-generated tags. Export an explicitly selected, permission-reviewed subset without altering live records; record licence evidence, object/book/artist grouping, original image hash, transformations, cultural context, medium, physical calibration status, annotation review and split.

## Approaches, from practical to data-intensive

### 1. Conditional statistical grammar: start here

Annotate one structural family well: envelope/axis, petals or lobes, centres, leaf veins, buds, stems, ports, branch tiers, repeats, negative space and separate border vocabulary. Fit distributions for part counts, relative size/angle, allowed attachment roles and repeat spacing, conditioned on source family/medium and documented region when supported. A hierarchical probabilistic or graph-rewrite grammar is a closer fit to the existing architecture than an unconstrained image model.

Use existing graph profiles, relation-prior integration, search and compiler. Preserve complete annotated example graphs as reconstruction controls; do not reduce all evidence to an averaged primitive outline. Generate candidate graphs and measure both source reconstruction and novel assemblies. An authored rewrite rule is procedural generation; it becomes learned grammar only when its parameters/rule probabilities are fitted from approved examples and evaluated.

An initial planning target is roughly 30–50 independently sourced, permission-reviewed objects within a deliberately narrow pilot, with reviewed masks/graphs. This is a collection target, not a universal minimum or promised performance threshold. The current five-object fixture pool does not meet it. Use learning curves and held-out errors to decide when more data is useful.

### 2. Pretrained vision for annotation and retrieval

- [SAM 2](https://github.com/facebookresearch/sam2): promptable masks; its official [training code](https://github.com/facebookresearch/sam2/tree/main/training) supports custom image/video fine-tuning. Start with inference-assisted human annotation, then fine-tune only if measured mask errors warrant it. A mask does not identify cultural meaning, a petal, an attachment or a stitch route. Code/checkpoints are documented Apache-2.0; review exact dependencies/checkpoints before integration.
- [Standard DINOv2](https://github.com/facebookresearch/dinov2): frozen visual features for similarity/retrieval and small learned part/family heads. Standard DINOv2 code/weights are Apache-2.0; the current repository also contains XRay/Cell variants with different noncommercial terms. Do not apply the standard-model licence to every variant.
- [Grounding DINO](https://github.com/IDEA-Research/GroundingDINO): text-conditioned box proposals can help locate obvious flowers/leaves. Treat stylised historic forms and tiny stitch details as an evaluation problem, not a guaranteed capability. Repository metadata reports Apache-2.0; code, checkpoints and datasets still need separate checks.
- Existing CLIP: retain as a coarse retrieval/filter baseline. Its softmax motif scores are not calibrated historical labels. Zero-shot tagging is inference, not fine-tuning on our embroidery data.

Named parts and graph relationships require human-reviewed targets. Avoid filling the training set solely with model-generated masks/labels and then evaluating against those same labels.

### 3. A learned graph predictor

Once there are enough reviewed examples, a small GNN can predict relations or rank partial assemblies using part geometry/embeddings, hierarchy, ports and repeat features. [PyTorch Geometric](https://pytorch-geometric.readthedocs.io/en/latest/get_started/introduction.html) supplies graph-learning components. It is a library, not a ready embroidery model.

Keep predicted relations typed: attachment, spatial nesting and repeat are different. Explicitly represent uncertainty. Larger neural graph generation requires more independent annotated data than estimating a few family-specific grammar distributions; begin with link/role prediction or ranking against simple baselines.

### 4. Vector learning and fitting

- [DeepSVG](https://github.com/alexandre01/deepsvg) demonstrates hierarchical learned vector-path representations. Repository metadata reports MIT. Its demonstrations concern vector graphics such as icons/fonts, not cultural attribution, graph-port validity or machine sewing. Consider it later for reference part geometry; keep canonical ASCEND paths fixed.
- [diffvg](https://github.com/BachiLi/diffvg) is a differentiable rasterizer, documented Apache-2.0. It can optimise reference vector parameters against image/mask losses. Optimisation is not automatically dataset training, and pixel agreement does not establish correct topology. Enforce port, hole, envelope and clearance constraints and retain independent graph comparisons.
- A pixel diffusion model is a possible visual ideation branch, but it does not directly supply editable part graphs, true stitch counts or validated machine paths. It should not replace the user's requested real-engine output.

### 5. Preference and manufacturing learning

Improve the current preference ranker with grouped validation, regularisation, uncertainty and left/right swap tests. The pairwise score should be consistent with reversing the pair; the current mean-centred difference features plus free bias do not explicitly enforce that property. Evaluate ranking on unseen design families/objects and reserve human review rather than optimising only automatic clutter/coverage proxies.

Fit manufacturing corrections separately from design preference. Inputs should include machine, fabric, thread, backing, hoop, recipe and measured defects. Keep immutable hard constraints and fail-closed registration requirements; learned estimates cannot certify production without physical evidence.

## Rivals and related engines

This is a documentation-based comparison, not a measured claim that Tesseract beats any product.

| Tool/system | Role and relevant idea | Relationship to Tesseract |
| --- | --- | --- |
| [Ink/Stitch](https://inkstitch.org/) | Open-source Inkscape embroidery digitizing: run/satin/fill variants, routing, underlay and machine output. [Satin tools](https://inkstitch.org/docs/satin-tools/) demonstrate rails and routing; [cutwork](https://inkstitch.org/docs/cutwork/) documents angle-specific cutting needles. | Strongest open digitizing comparator and possible downstream interchange target. Repository metadata reports GPL-3.0; account for applicable licence obligations before incorporating code. No implementation or performance benchmark was run here. |
| [Wilcom EmbroideryStudio](https://wilcom.com/embroiderystudio/designing) | Commercial design/digitizing workflow. Its [Web API](https://wilcom.com/web-api) advertises embroidery integration services. | Production workflow/output comparator; possible licensed service integration. Do not assume its automatic features reconstruct historical grammar. |
| [Hatch](https://hatchembroidery.com/) | Commercial digitizing/editing product levels | Comparator for editable embroidery design workflows. Marketing pages were inspected, not software executed or trained on. |
| [Embird](https://www.embird.net/) | Modular editing/digitizing, trace/photo-to-embroidery and cross-stitch tools, many formats | Comparator for object editing, format compatibility and specialised digitizing operations. No quality benchmark performed. |
| [pyembroidery](https://github.com/EmbroidePy/pyembroidery) | Reading/writing embroidery formats and handling stitch/colour/jump/trim commands; MIT repository metadata | Possible format interchange/round-trip component. A file encoder is not proof that contour geometry has been correctly digitized. |
| [libembroidery](https://github.com/Embroidermodder/libembroidery) | Embroidery-file read/write/manipulation with a CLI; zlib repository metadata | Alternative format/automation reference; assess supported commands/formats and round-trip behaviour against actual fixtures. |
| [Seamly](https://seamly.io/) | Parametric apparel CAD with measurements and reusable construction formulas | Relevant to garment-piece geometry, seams and placement boundaries, separate from motif learning/digitizing. |
| [Houdini L-System SOP](https://www.sidefx.com/docs/houdini/nodes/sop/lsystem.html) | Recursive rules, branching, modeled geometry insertion and growth bounded by shapes | Good procedural analogue for stem → branch → leaf/bud/flower construction. Procedural recursion does not prove historical embroidery used fractals. |
| [Blender Geometry Nodes](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/introduction.html) | Geometry expressed through reusable parameterised node operations | Relevant architecture for editable, deterministic assemblies and reflow; not a trained regional embroidery system. |

Brother PE-Design URLs attempted in this pass returned 404, so its specific capabilities are not used as verified comparison evidence. No commercial service account or private documentation was accessed.

## Similar structures to reuse

- **Scene graphs and CAD feature graphs:** composition → garment regions → assemblies → parts → production objects. Parameters belong to the appropriate level; parts preserve identity and provenance across reflow.
- **L-systems and graph-rewrite grammars:** local expansion rules with branch/terminal roles. The publicly retrieved [Algorithmic Beauty of Plants](https://algorithmicbotany.org/papers/abop/abop.pdf), selected introductory sections, explains rewriting and plant construction. Use as a mathematical/procedural reference, not a culturally learned motif source.
- **Constraint satisfaction and constrained optimisation:** predicted proposals are accepted only if ports, repeats, nesting, no-go areas and manufacturing requirements pass. Reuse Tesseract's validators and compiler.
- **Retrieval with conditional generation:** locate a reviewed construction family, retain its attribution, and generate a new assembly from learned structural parameters. Avoid flattening Ukrainian regions, Arabic/Islamic geometries, Ottoman textiles and English material into one interchangeable motif alphabet.
- **Compiler stages:** source annotation → inferred/proposed graph → validated reference reconstruction → canonical assembly → stitch objects → machine-format encoding → measured sample. Losses and acceptance evidence differ at each stage.

## A concrete first experiment

1. Produce a versioned, local, training-permission manifest with source/artist/book groups, hashes, calibration status and reviewed part/relationship annotations. Keep live Neon data unchanged.
2. Select one narrow family; retain individual construction graphs. Add synthetic structural controls without counting them as independent historic objects.
3. Split by source object and artist/book; group crops, alternate images and perturbations together. With very few groups, use explicitly qualified leave-one-group-out evaluation rather than presenting unstable percentages as a robust test set.
4. Compare current primitive/codebook and manually authored grammar baselines against a fitted conditional graph prior. Optionally test pretrained mask assistance before deciding whether fine-tuning is necessary.
5. Measure part-mask/boundary accuracy, role/relation precision and recall, repeat vector error, reconstruction geometry, canonical invariants, port continuity, negative-space and clearance failures. Record blind human preferences separately from training labels and image metrics.
6. Save dataset/code fingerprints, parameters, seed, losses, fitted artifact and independent evaluation. Keep the model a candidate until it improves relevant held-out results without violating hard constraints; do not auto-promote based on image counts.
7. Demonstrate one source reconstruction and one original connected composition with the actual engine. Machine-file/stitch evaluation is a separate experiment requiring real digitizing and physical calibration.

The first honest deliverable is an audited trainable subset plus a reproducible fit/evaluation report. That can establish a small trained construction component; it would not establish complete historical understanding or production approval.
