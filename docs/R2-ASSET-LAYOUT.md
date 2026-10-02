# R2 Asset Layout

Bucket: `ascend-glyph-assets`

Immutable source layout:
- `atlas/v1/earth.png`
- `atlas/v1/water.png`
- `atlas/v1/fire.png`
- `atlas/v1/air.png`
- `atlas/v1/spirit.png`

Canonical vector layout:
- `glyphs/{family}/{glyph-id}/v1.svg`

Derived output layout:
- `designs/{design-id}/v{version}/preview.png`
- `production/{design-id}/v{version}/tech-pack.pdf`
- `production/{design-id}/v{version}/manifest.json`

No reconstructed SVG is promoted or uploaded as canonical merely to fill a missing object. Exact-source verification remains the gate.
