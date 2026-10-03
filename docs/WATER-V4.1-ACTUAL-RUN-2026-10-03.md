# Water V4.1 — actual execution, 2026-10-03

The V4.1 centerline vectorizer was executed against the mounted authoritative Water atlas (1536×864) using the locked Water crop registry. SVGs were independently rendered back to PNG at the exact crop dimensions and compared with the V4.1 source mask.

Results:
- water-01: IoU 0.5872 — HOLD. Main arc is captured, but the dotted inner arc and lower guide ornament prove the crop contains mixed semantics; not canonical.
- water-02: IoU 0.6833 — REVIEW. Twin wave topology is preserved and this is the strongest clean Water candidate, but no canonical promotion without visual geometry review.
- water-03: IoU 0.2412 — FAIL/HYBRID. Outer ring was lost by the centerline graph; must use compound/hybrid reconstruction.
- water-04: IoU 0.6419 — REVIEW. Flow topology largely preserved; source includes dotted/guide artifacts that must be separated without guessing.
- water-05: IoU 0.6485 — HOLD. Triple arc is captured but the diamond/guide material is not safely reconstructed by this stroke pass.

No Water glyph is promoted to canonical-digital by this run. This is intentional: metrics are evidence, never authority.

## Concrete finding
The prior blocker is now localized. V4.1 works reasonably for clean stroke glyphs, but the atlas crops include nearby guide dots/ornaments and water-03 requires a different topology method. The next correction target is water-02 because it is a clean two-stroke glyph with no required fill/compound-path semantics.

Source authority remains the atlas. No geometry is redesigned or symmetrized.
