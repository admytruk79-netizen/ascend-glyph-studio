# Tesseract 3 — Garment-scale visual language compiler

## Fundamental correction
Do not generate unrelated zone SVGs and join them with metadata. Compile one garment-wide semantic/topological graph into a surface-aware master composition, then project it onto physical pattern pieces. A seam is a coordinate transform and manufacturing constraint, not a new semantic beginning.

## Eight-stage compiler
1. **Intent graph:** concepts, priorities, contradictions, protected meanings and exclusions.
2. **Source geometry registry:** immutable traced paths from Oleksandr's drawings, including open ends, asymmetry, irregular spacing and original proportions. Source tracing requires verified source assets; procedural approximations must be marked provisional.
3. **Typed geometric grammar:** seed, axis, torus, orbit, branch, opposition, crossing, emission and void. Each has ports, allowed transformations, orientation, chirality, scale limits and semantic invariants.
4. **Relational solver:** typed connections, direction, cardinality, path degree, containment, interruption, repetition, hierarchy and temporal development. Preserve contradiction rather than automatically harmonizing it.
5. **Garment atlas:** pattern pieces as parametric surfaces with seam adjacency, orientation, grain, ease, taper, circumference, no-go regions and registration landmarks. Build the whole composition in atlas coordinates before projecting into zones.
6. **Composition search:** hierarchical coarse-to-fine optimization. First optimize large silhouette and negative space, then passages and bands, then glyphs, finally stitch-scale detail. Keep Pareto-diverse candidates rather than a single weighted-score winner.
7. **Manufacturing compiler:** adapt elastic geometry by material, process and machine envelope; preserve immutable semantics and provenance. Segment crossing trajectories with matching seam registration; distinguish simulated feasibility from sample validation.
8. **Explainable outputs:** master SVG, pattern-piece SVGs, semantic feature map, seam registration plan, manufacturability report, source provenance and reasons candidates were rejected.

## Mathematical constraints
- For every seam-connected trajectory, projected endpoints must coincide within a specified tolerance after pattern-piece transform; tangents must agree unless an intentional corner or interruption is encoded.
- Closed toroidal/return structures must retain their closure under projection; a deliberate void is never filled automatically.
- Branch order and ancestry are topological invariants. Size changes may alter spacing but must not reorder semantic events.
- Minimum stroke, gap, stitch density, hoop envelope, shrinkage and seam allowances are material/process constraints, never universal constants.
- Each garment size gets a new constrained projection of the same semantic genome, not uniform image scaling.

## Anti-generic evaluation
Reject candidate families with excessive symmetry, repeated diamonds, identical floral terminals, same-scale repetition, stereotyped tribal motifs, or resemblance to restricted cultural sources. Compare topology and silhouette as well as pixels. Reward legible identity at distance, meaningful complexity up close, controlled voids, unexpected but coherent transitions and reproducible manufacture.

## Next implementation slices
A. Canonical source-path ingestion and traced SVG verification.
B. Typed ports and graph invariants.
C. Parametric garment atlas and seam coordinate transforms.
D. Whole-garment trajectory geometry with continuous tangents.
E. SVG path renderer for the actual verified ASCEND primitives.
F. Property-based tests for closure, seam continuity, size reflow, deterministic output and protected semantic invariants.
G. Runtime execution and visual review against Oleksandr's original drawings.

**Current limitation:** existing zone trajectory metadata does not yet draw a continuous physical path; existing projector renders straight edges and circles. Neither should be presented as production-ready artwork.
