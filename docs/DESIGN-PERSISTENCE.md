# Constructor persistence contract

A saved design is not a flattened picture. It stores:
- immutable source glyph ID/version
- garment and placement zone
- ordered layers
- x/y
- uniform scale
- rotation
- mirror flags
- composition mode

Reopening a design reconstructs the same SVG composition from the same locked source versions. Checkout/production will lock the design version and its manifest hash.

The exact-source SVG gate remains independent: no placeholder geometry may be promoted to a source glyph.
