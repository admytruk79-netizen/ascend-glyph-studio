# Atlas fragment reconstruction pipeline
# Source sheets are user-approved ASCEND artwork.
# IMPORTANT: crop coordinates have one authority only:
# packages/glyph-registry/data/source-raster-registry.v1.json
#
# This helper intentionally contains no duplicated BOUNDS table. Earlier hard-coded
# coordinates predated the locked source registry and could drift from canonical crops.

from dataclasses import dataclass
import json
from pathlib import Path

@dataclass(frozen=True)
class FragmentSource:
    family: str
    index: int
    bounds_px: tuple[int,int,int,int]

def load_bounds(repo_root: Path) -> dict[str, list[tuple[int,int,int,int]]]:
    registry = repo_root / "packages/glyph-registry/data/source-raster-registry.v1.json"
    data = json.loads(registry.read_text())
    return {
        family: [tuple(bounds) for bounds in crops]
        for family, crops in data["cropRegistry"].items()
    }

FIRE_NAMES=["rising-rays","split-chevrons","central-core","expanding-lines","ascending-path","ignition-point"]

# Required implementation stages:
# authoritative crop -> luminance/alpha mask -> remove raster-only noise
# -> route-specific reconstruction -> render back at exact crop dimensions
# -> source/render registration -> overlay metrics -> structural/topology checks
# -> independent visual review -> canonical-digital promotion only if all gates pass.
#
# Never smooth, symmetrize, regularize, or infer missing geometry for aesthetics.
# Metrics from the same extracted mask are not independent verification.
