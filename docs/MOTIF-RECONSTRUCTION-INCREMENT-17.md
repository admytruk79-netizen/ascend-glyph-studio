# Increment 17: reference strand crossing decomposition

This increment adds an interlace topology sidecar to the existing MotifGraph,
without changing its schema, canonical ASCEND glyphs or production gates.

`analyseMotifInterlace` reuses existing world transforms and segment-distance
geometry. It finds transverse intersections between different element paths.
Over/under order requires an explicit observation and evidence; geometry alone
does not infer it. Unsupported, duplicate and ambiguous observations fail.
Endpoint/vertex and collinear contacts remain ambiguous. A 2,000-segment budget
bounds analysis. Self-crossing strands are not supported in this increment.

The source fixture is a manual draft from Met object 388374, attributed by the
catalogue to Albrecht Dürer. The retained official API and source image establish
CC0 admission and the benchmark verifies the image hash and dimensions. This
is not Arabic or Ukrainian cultural attribution.

One lower central crossing was examined at enlarged resolution. Two short
approximate strand centrelines were annotated: the descending light strand is
uninterrupted, while the rising strand has a visible interruption. Its hidden
continuation is explicitly an interpolation hypothesis. The source overlay was
visually reviewed; this is not an independent expert annotation or complete
decomposition of the medallion.

Run `npm run benchmark:motif:interlace`. It emits the source overlay, a topology
report and a two-strand reference illustration under
`artifacts/motif-reconstruction/interlace-v1/`. The illustration uses an authored
display gap to show order; that gap is not a thread width, jump or machine route.
The retained report is in `data/research/motif-benchmarks/interlace-v1/`.
The historical benchmark chain and existing CI workflow now execute this stage.

Verified locally: engine typecheck/build, 47 test files with 175 passing tests,
production pilot, and the actual-source benchmark under Node 22. The benchmark
reports one reviewed crossing, zero unresolved transverse crossings and **one
unchanged clearance violation**. Reference order does not waive that violation.
No model fitting, stitch count, physical calibration, machine approval or sew-out
was performed in this increment. Full strand continuity, closed loops,
self-crossings and independent source holdouts remain incomplete.

Next: expand strand annotations across a complete small knot unit, represent
self-crossings explicitly, then test continuity and crossing order against
independent approved references before fitting any interlace-order model.
