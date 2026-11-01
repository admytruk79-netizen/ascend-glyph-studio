# Tesseract multi-hoop segmentation candidate handoff (2026-10-31)

## Scope and status

The new `hoop-segmentation.ts` module creates **reference-only geometry groupings** for oversized embroidery job plans. The existing single-hoop gate **still rejects** oversized jobs with `machine-field-exceeded:segmentation-required`. A successful grouping is not a machine program, production approval, registered segmentation, or evidence of a physical sew-out.

## Algorithm

1. Check the selected machine's positive finite embroidery field in millimetres and the job envelope.
2. Reject empty input, duplicate IDs, non-finite points, objects outside the job envelope, and any individual stitch-IR object wider or taller than the selected native-orientation field. **Never clip or cut a canonical motif.**
3. Sort source objects deterministically by upper-left position and ID.
4. Greedily place intact objects in the first existing tile whose union bounding box still fits the field, otherwise open a new tile (maximum 128).
5. Return tile IDs, intact source-object IDs, global bounding boxes and reference hoop origins. Coordinates and stitch-IR objects are not modified.

A tile origin is a **planning reference only**. It is not a factory-approved fixture datum. The current algorithm does not optimize tile count, solve hoop overlap, support rotated hoop orientations, generate registration marks, account for frame interior obstructions, check seam crossings or transform global stitches into machine-local files.

## Required before registered execution

- Manufacturer-selected machine, actual hoop/frame, garment stage (flat panel versus finished sleeve), allowable orientation and usable field measurements.
- Measured sleeve taper, seam/no-go geometry, local hooping constraints and accessible embroidery surface.
- Registration strategy: physical datum, mark locations, overlap/seam continuity, tolerance and recovery procedure for repositioning.
- Machine-specific digitization, thread/material/stabilizer calibration and independent tile stitch files.
- Controlled sew-out: record registration error, distortion, puckering, alignment, wash behavior and manufacturer sign-off.

The `releaseBlockers` field remains populated regardless of geometry success. Neither the reference Brother nor Tajima machine templates is a manufacturer-validated ASCEND production profile.

## Verification requirements

Run `npm --workspace @ascend/tesseract-engine run typecheck` and `npm --workspace @ascend/tesseract-engine test`, including `test/hoop-segmentation.test.ts`. Then run the complete-shirt and tapered-sleeve benchmark against the 3.7 visual baseline, inspect registration feasibility and reconcile overlapping promotion PRs. Passing unit tests does not replace machine/fabric testing.

## Preservation

The planner operates only on existing stitch-IR point envelopes and IDs. It does not alter ASCEND source geometry, source attribution, motif lineage, rights gates, cultural labels or training admission policy. Reference data must not be promoted to `MANUFACTURER-VALIDATED` or `PRODUCTION-VALIDATED` without evidence.

## Reference registration geometry audit (2026-11-01)

The candidate now includes `registrationGeometryAudit` when at least one valid tile is generated. For each pair of proposed native-orientation field rectangles, it records strictly positive shared-area rectangles and whether all tiles are connected through shared-field corridors. The audit is deterministic and does not alter stitch coordinates, source motifs, or provenance. Touching edges with zero overlap are not treated as corridors.

- `connectedByFieldOverlap: true` means only that the *reference rectangles* form a connected graph. It does **not** prove that registration marks can be safely placed, that the frame can access the overlap, or that a seam or sleeve can be registered.
- Disconnected fields receive `no-continuous-shared-field-corridor-external-registration-datum-required`; external alignment may still be possible with manufacturer-approved fixtures, but is **not** assumed.
- All candidate plans retain `registration-marks-and-cross-hoop-continuity-unverified`, manufacturer fixture blockers, and physical sew-out blockers. No release state is promoted.
- Pairwise field-overlap analysis is bounded by the existing 128-tile maximum; it does not claim optimized hoop placement or machine-local digitization.

**Next implementation gate:** use manufacturer-measured usable field/hoop restrictions and a verified garment seam/no-go map to find permissible registration-mark sites, then validate registration tolerance with a controlled sew-out. Until those inputs exist, the audit is geometry evidence only.
