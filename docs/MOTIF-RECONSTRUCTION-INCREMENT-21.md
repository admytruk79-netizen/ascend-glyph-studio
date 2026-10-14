# Increment 21: paired construction cells and machine field review

Construction lab now offers **Paired glyphs with framing rules** alongside the
original single-glyph band. The new option uses a main canonical glyph and a
separate canonical branch glyph in each central cell, two smaller border rows
and two straight framing rules. These are authored spatial groups, not inferred
stem attachments or exact historical embroidery cells. Canonical paths remain
unchanged and receive only uniform scale and rotation.

Physical capacity budgets include all four glyph rows. Every glyph must retain
the envelope's minimum scale. A conservative bounding-footprint gap check runs
before compilation and rejects insufficient cell clearance; grouping never
waives overlap. The framing rules are distinct auxiliary run objects, not new
ASCEND glyphs. Thread/fabric-dependent clearance and sew-out remain unresolved.

The UI now has a **Machine reference** selector for the existing published
Brother PR1055X and Tajima TMBP2-SC reference profiles. It reuses the engine's
machine validation and manufacturing job plan. The unsupplied generic-machine
placeholder is excluded. Rectangle fit permits orientation swapping, as in the
existing engine field gate; it does not establish actual accessory, hoop,
garment-wrapping or registration feasibility.

An oversized rectangle produces a visible field-exceeded message. The geometry
can still be downloaded as a reference SVG; it is not a machine-ready file and
does not become production-approved. All templates retain REFERENCE status,
blocked manufacturing validation and an unavailable stitch count. The UI's
learned-model status remains explicit: candidate statistical models are not
activated by this authored-template change.

## Verified

- Engine typecheck/build, all 183 engine tests and existing production pilot.
- Web TypeScript/Vite production build; existing large-bundle advisory remains.
- Browser flow: paired/single construction changes the generated SVG; a
  400-mm-wide Brother rectangle reports overflow; the same area fits the Tajima
  reference field; a 300×70-mm example downloads successfully.
- No browser page errors; desktop and 390-pixel mobile screenshots reviewed;
  mobile horizontal-overflow check passes.

Screenshots, downloaded SVG and browser results are retained under
`data/research/motif-benchmarks/construction-lab-v2/`. Earlier preview artifacts
remain intact. No training, Neon write, production deployment or manufacturer
approval occurred in this increment.

Remaining: connect evaluated learned construction guidance, build richer motif
assemblies, add fabric and actual machine setup controls, validate garment seams
and wrap placement, then digitize and verify exported stitch files with a sew-out.
