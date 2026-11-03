# Pilot renderer evidence — 2026-11-03

Source: GitHub Actions run [41685741161](https://github.com/admytruk79-netizen/ascend-glyph-studio/actions/runs/41685741161), commit `d4ed8d6ba172cd26b1fdbb581a0ea33d60b933e7` on draft PR #34. Artifact: `tesseract-pilot-svg` (artifact ID `13253639063`).

- GitHub render job: **success** (checkout, Node 22, npm install, TypeScript build, pilot export, artifact upload).
- Deterministic seed: `heritage-start-001`; generated candidates: **12**; exporter errors: **0**.
- Output: `lineage-specimens.svg`, nine reference pattern-piece SVGs, `tesseract-batch.json`, `production-manifest.json`, `render-summary.json`.
- Manifest `productionApproved`: **false**. Blockers: `embroidery-machine-not-selected`, `reference-pattern-requires-validation`.
- Visual inspection: lineage specimen sheet renders sparse geometric linework and has overlapping assessment-label text. Reference sleeve and front piece SVGs show construction/placement geometry rather than a finished embroidered composition. These are real pilot outputs, **not** finished apparel designs or manufacturer-approved stitch files.

## Required next engineering gate

Add a deterministic, candidate-bound garment composition renderer so the winning candidate's generated geometry appears on actual piece/zone SVGs (rather than only in the lineage specimen sheet). Verify cross-zone continuity and registered sleeve wrap visually, add non-empty design-geometry assertions, then compare complete-shirt and tapered-sleeve outputs against baseline 3.7. Preserve source geometry, cultural/provenance rules and reference-only manufacturing status; no production promotion without manufacturer and physical sew-out validation.
