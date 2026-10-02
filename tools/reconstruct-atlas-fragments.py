# Atlas fragment reconstruction pipeline
# Source sheets are user-approved ASCEND artwork. This script records the extraction/normalization
# contract used by Build 0.1. It deliberately does NOT auto-promote traces to canonical geometry.
from dataclasses import dataclass

@dataclass(frozen=True)
class FragmentSource:
    family: str
    index: int
    bounds_px: tuple[int,int,int,int]

# Bounds are registered against the 1536x864 supplied atlas sheets.
BOUNDS = {
 "air":[(1180,145,1280,245),(1295,145,1390,245),(1405,145,1495,245),(1180,260,1280,355),(1295,260,1390,355),(1405,260,1495,355)],
 "fire":[(1060,135,1180,275),(1200,135,1320,275),(1350,135,1470,275),(1060,310,1180,480),(1200,310,1320,480),(1350,310,1470,480)],
 "earth":[(1135,130,1215,215),(1230,130,1310,215),(1325,130,1410,215),(1135,245,1215,330),(1230,245,1310,330),(1325,245,1410,330),(1135,365,1215,455),(1230,365,1310,455),(1325,365,1410,455)],
 "water":[(425,175,535,260),(425,265,535,335),(425,345,535,430),(425,435,535,520),(425,525,535,620)],
 "spirit":[(1000,150,1130,275),(1160,150,1300,275),(1330,150,1460,275),(1000,285,1130,420),(1160,285,1300,420),(1330,285,1460,420)]
}

FIRE_NAMES=["rising-rays","split-chevrons","central-core","expanding-lines","ascending-path","ignition-point"]

# Required implementation stages:
# crop -> luminance/alpha mask -> remove raster-only noise -> contour/path reconstruction
# -> normalize viewBox -> source/render registration -> overlay metrics -> structural checks
# -> human review if ambiguous -> canonical-digital promotion.
#
# IMPORTANT: overlap metrics from the same extracted mask are not independent verification.
# Canonical promotion requires comparison to the atlas source plus structural inspection.
