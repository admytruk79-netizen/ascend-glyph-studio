# Tesseract Solver v0.1

The engine now generates whole relational candidate states, not independent SVG placements.

Flow:
glyph selection -> deterministic seeded ordering -> typed relationship graph -> graph scoring -> manufacturing measurement -> production-envelope validation -> ranked candidates.

Rules:
- 2–5 immutable source glyph references per generated state.
- source geometry is never mutated by the solver.
- family behavior biases relationship selection.
- the same seed/input recreates the same candidates.
- hard manufacturing validation is separate from aesthetic/coherence scoring.
- passing digital manufacturing rules promotes only to manufacturable-estimate, never sew-out or production-approved.
- failed candidates remain digitally-valid and carry repair/error information.

v0.1 intentionally does not pretend to know embroidery measurements before canonical source vectors and physical recipes are verified. The measurement adapter is therefore explicit: garment/material/factory-specific geometry supplies feature width, gaps, physical dimensions and colors.
