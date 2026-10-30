# Machine feasibility integration — 2026-10-30

Status: development branch, not production approved.

The selected reference machine profile now reaches the embroidery manufacturing
job planner from the pattern generator. Unknown selected IDs fail closed. A
single-hoop plan rejects missing or invalid machine field, frames, file formats,
needle/color capacity, registration tolerance, color overflow, and oversized
envelopes in both orientations. Legacy callers without a machine still receive
geometry-only reference plans.

No canonical ASCEND geometry, cultural semantics or source provenance changed.
The validation.valid flag is NOT a production-ready flag. Multi-hoop stitch
splitting, registration, garment access, machine-specific digitization, material
calibration, and physical sew-out remain unvalidated.

Verify with npm run verify:tesseract-worker in GitHub Actions, then benchmark
sleeve and complete-shirt jobs against the 3.7 golden baseline. Reconcile
overlapping open PRs #22 and #28 before merging.
