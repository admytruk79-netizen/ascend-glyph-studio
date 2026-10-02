# ASCEND Glyph Studio

A standalone procedural garment-design and manufacturing platform built around five canonical glyph families: **Earth, Water, Fire, Air, Spirit**.

> The atlases are the source vocabulary. The glyphs are the language. The garment is the canvas.

## Build 0.1
Foundation for:
- canonical glyph registry
- deterministic composition engine
- garment/material/size specifications
- production and manufacturer validation
- production-package generation
- customer/studio web interface
- ROVIQ manufacturing integration
- Android packaging later

## Non-negotiables
- Glyph-only system: no card/key dependency.
- Canonical glyph vectors are immutable source assets.
- Same design manifest must recreate the same composition.
- Manufacturing validity is distinct from physical production approval.
- New glyph/fabric/placement recipes require physical sampling before Production Approved status.

## Structure
```
apps/web
packages/design-schema
packages/glyph-engine
packages/glyph-registry
packages/garment-spec
packages/material-spec
packages/production-validator
packages/renderer
services/api
docs
```

Canonical glyph SVG assets will be added only after the approved atlas artwork is verified.
