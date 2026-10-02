# Architecture — Build 0.1

## Pipeline
Glyph Registry → Composition Engine → Garment/Material/Size Context → Production Validator → Renderer → Locked Design Version → Production Package → Manufacturing Job → QC → Shipment.

## Packages
- **design-schema**: shared IDs, manifests, statuses and contracts.
- **glyph-registry**: canonical metadata and immutable vector references.
- **glyph-engine**: deterministic Border, Path, Field, Emblem and Composition generation.
- **garment-spec**: garment blocks, sizes, POMs and placement-zone geometry.
- **material-spec**: fabrics, threads, stabilizers and physical test status.
- **production-validator**: geometric, embroidery, garment and manufacturer constraints.
- **renderer**: SVG/preview output derived from a manifest.
- **services/api**: accounts, designs, versions, production packages, orders and manufacturing interfaces.
- **apps/web**: responsive Glyph Studio; later wrapped for Android.

## Approval model
DRAFT → DIGITALLY_VALID → SAMPLE_REQUIRED → SAMPLE_APPROVED → PRODUCTION_APPROVED.

Software validation never promotes an untested physical recipe to Production Approved.
