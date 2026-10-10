# Machine feasibility integration — development verification

Integrated on `codex/motif-graph-reconstruction` (draft PR #22). The reference patch was adapted to the actual source rather than applied by illustrative hunk numbers.

`planEmbroideryJob` now accepts an optional `MachineTemplate`. It rejects unverified/non-finite/non-positive or non-mm field dimensions; a whole job that cannot fit either field orientation; non-positive/non-integral or exceeded color capacity; empty or unsupported accepted-format declarations. Oversized jobs report `machine-field-exceeded:segmentation-required`; no registered segmentation is automatically planned or approved.

`generatePatterns` passes its selected template into the planner. An explicitly requested unknown profile now throws `unknown-machine-profile` instead of silently dropping machine checks. Non-machine callers and weaving code are unchanged. Geometry validity remains a digital planning check, not physical approval; the reference-only warning and template confidence remain unchanged.

Installed the handoff's four tests under `packages/tesseract-engine/test/machine-feasibility-regression.test.ts`, then added invalid measurement/capacity/format, exact-boundary, rotated-fit and compatibility coverage. Generator regressions verify machine propagation for a 360 x 500 mm sleeve and unknown-profile rejection.

Verification commands:

```sh
npm run typecheck --workspace=@ascend/tesseract-engine
npx vitest run packages/tesseract-engine/test/machine-feasibility-regression.test.ts packages/tesseract-engine/test/manufacturing-job-integration.test.ts packages/tesseract-engine/test/manufacturing-job-plan.test.ts
npm run verify:tesseract-worker
```

The initial targeted run passed 24 tests; a later malformed runtime units/formats test brings this targeted set to 25. Full worker verification passed Tesseract typecheck/build, all 102 Tesseract tests, the reference pilot, stitch-engine typecheck and all 22 stitch-engine tests. The pilot retained `productionApproved: false` and machine-selection/reference-pattern blockers. No manufacturer-specific approval, selected-frame/access verification, stitch-count budget scheduling, machine file export, registered multi-hoop segmentation or physical sew-out is established by these checks.

Further motif reconstruction work builds on this gate. A selected machine must also reach the experimental motif assembly planner; passing a reference machine cannot remove canonical-layout or physical-validation blockers.

The subsequent [motif increment 2](../MOTIF-RECONSTRUCTION-INCREMENT-2.md) extends this integration into embroidery batch zone plans and pilot packet blockers, corrects physical/display coordinate mixing, and records final Node 22 verification and benchmark results.
