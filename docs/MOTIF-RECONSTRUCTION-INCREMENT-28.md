# Increment 28 — reopenable studio projects

The studio now saves the displayed composition settings as a versioned ASCEND JSON project and opens these files without advancing the seed. Width, height, assembly method, motif, family, density and selected reference machine are restored together. Unsaved control changes do not change what Save project exports. Opening resets the stitch display, and the existing engines regenerate the saved composition.

Import accepts only supported fields and values, finite bounded dimensions/density, a nonnegative safe-integer seed and an available machine ID. Files over 16 KiB are rejected before reading. Invalid files preserve the current design and display an error. Imported content is not injected into HTML.

Verification: web TypeScript/Vite build passed. Playwright against the production build saved a generated composition, generated another, reopened the saved file and compared the resulting SVG markup exactly. Malformed-format import preserved the original SVG; no page errors occurred.

Projects store settings, not immutable engine/library snapshots. Exact replay was verified with the current engine and assets; future engine/library changes can alter regeneration. This feature adds no training, digitization, machine export or production approval. Canonical geometry and cultural provenance are unchanged. The existing large-bundle build warning remains.
