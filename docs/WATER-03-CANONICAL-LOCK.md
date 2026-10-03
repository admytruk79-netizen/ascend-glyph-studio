# Water 03 canonical lock

Water-03 is accepted as canonical-digital ASCEND source geometry.

Verification basis:
- authoritative Water atlas crop: x=425..515, y=350..430 (90×80)
- reconstruction route: hybrid/source-envelope, replacing the rejected centerline-only V4.1 route
- accepted source resolves to exactly two meaningful ink components in the locked crop
- canonical SVG stores the exact pixel-envelope contours in crop coordinates; it does not smooth, symmetrize, regularize, or invent a centerline
- the compound outer contour preserves its source negative space; the second contour preserves the lower open arc envelope
- viewBox remains the locked 90×80 crop coordinate system
- render-back is deterministic at the source dimensions because SVG boundaries follow the accepted binary source-envelope grid; topology and component count are preserved

Registry state: canonical-digital / geometry-verified.

This lock supersedes only the failed Water-03 centerline candidate described in the V4.1 run. Production state remains separate: this does NOT mean embroidery sew-out or production-approved.
