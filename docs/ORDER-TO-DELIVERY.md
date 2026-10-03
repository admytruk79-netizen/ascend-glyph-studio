# Order-to-Delivery Backbone

ASCEND is built as a closed production loop, not a mockup generator.

Customer design -> production validation -> eligible manufacturer -> payment -> immutable production package -> manufacturer acceptance -> production -> QC -> shipping -> delivery.

## Checkout contract
Checkout locks a ProductionDesignManifest. It records exact canonical glyph versions, deterministic Tesseract seed/state hash, garment style/revision/size/zones, material revision/color, manufacturing recipes, manufacturer capability-profile version and integer minor-unit price.

## Guarded workflow
Production states may only advance through approved transitions. The system fails closed: no production before manufacturer acceptance; no shipment before QC; delivered jobs are terminal.

## Operational split
ASCEND owns customer design, checkout contract and production package. ROVIQ owns operational orchestration: manufacturer eligibility/routing, PO/job lifecycle, status/audit, QC and shipment events.

## Pilot
The first end-to-end production path remains deliberately narrow: hero linen shirt + approved material/color/size + approved glyph recipes + one qualified manufacturer. Expansion follows evidence from the pilot.
