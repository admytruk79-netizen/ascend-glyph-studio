# Codex handoff: machine feasibility integration

Status: proposed integration assets committed as references, NOT integrated into runtime or verified by CI.

## Read these files
- docs/codex/machine-feasibility-integration.patch
- docs/codex/machine-feasibility-regression.test.ts
- docs/TESSERACT-MOTIF-RECONSTRUCTION-CODEX-BRIEF.md
- docs/PRODUCTION-ENGINE-POA.md
- packages/tesseract-engine/src/manufacturing-job-plan.ts
- packages/tesseract-engine/src/pattern-generator.ts
- packages/tesseract-engine/src/machine-template.ts

## Implementation
1. Inspect current source and adapt the reference patch to the actual file; its hunk line numbers are illustrative and it is not claimed to apply automatically.
2. Add an optional machine template to planEmbroideryJob and pass the selected machine from pattern-generator.
3. Fail closed for missing/invalid machine field measurements, oversized single-hoop job requiring segmentation, invalid/excessive color capacity, and missing accepted formats.
4. Copy the reference regression tests into packages/tesseract-engine/test/ and adjust to current exported types.
5. Preserve existing non-machine callers and weaving behavior. Avoid marking a reference profile as manufacturer-approved.
6. Run typecheck, targeted tests and the repository's full relevant checks. Record actual results and failures.
7. Add future registered multi-hoop segmentation with placement and registration constraints as a separate tested feature; no silent auto-approval.

## Caveats
- The proposed dimension check conservatively rejects an oversized whole job; it does not implement multi-hoop segmentation.
- Field dimensions, needle count, accepted formats, garment access, thread changes and physical sew-out are separate constraints. MaxColors is used as a conservative initial limit, not a full scheduling model.
- No manufacturer-specific machine approval, digitization, stitch file export, or physical sew-out is established by these files.
- Submit implementation as a development PR and report commit hashes and verification evidence.
