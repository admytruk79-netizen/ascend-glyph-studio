# Bounded Neon source intake

See `docs/MOTIF-RECONSTRUCTION-INCREMENT-31.md` for implementation, verification and limitations. The manifest is a read-only database snapshot; fetch-report records actual downloaded bytes and hashes. Training-manifest admits only the 53 references used by the existing codebook trainer. `training-run` contains its actual report and model; motif-selection records the runtime candidate fit. The image cache is reproducible and ignored by Git. Absolute receipt paths describe the original execution workspace.
