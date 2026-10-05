#!/usr/bin/env python3
"""ASCEND deterministic semantic pattern generator. Produces original SVG from meanings/principles; no historical motif geometry."""
import argparse,hashlib,json,math,random
def seedint(s): return int(hashlib.sha256(s.encode()).hexdigest()[:16],16)
def pattern(seed,meanings,principles,w=1200,h=320):
 r=random.Random(seedint(seed+"|"+"|".join(meanings)+"|"+"|".join(principles))); parts=[]; n=max(48,min(240,36+len(principles)*12))
 for i in range(n):
  t=i/max(1,n-1); x=30+t*(w-60); band=i%5; y=h*(.18+.16*band)+math.sin(t*math.pi*(4+band))*18
  rad=2.2+(i%7)*.55
  if "branching-flora" in principles or "floral-tooling" in principles:
   parts.append(f'<path d="M{x:.1f} {y:.1f} q{rad*2:.1f} {-rad*3:.1f} {rad*4:.1f} 0 q{-rad*2:.1f} {rad*3:.1f} {-rad*4:.1f} 0" fill="none"/>')
  else: parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}" fill="none"/>')
 axis=' '.join(f'{30+j*(w-60)/24:.1f},{h/2+math.sin(j*.7)*28:.1f}' for j in range(25))
 meta=json.dumps({"seed":seed,"meanings":meanings,"principles":principles,"copiedHistoricalGeometry":False},separators=(",",":"))
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" data-ascend="semantic-pattern"><metadata>{meta}</metadata><g stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke">{"" .join(parts)}<polyline points="{axis}" fill="none" opacity=".35"/></g></svg>'
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--seed",default="ascend");p.add_argument("--meanings",default="lineage,flowering,ascent");p.add_argument("--principles",default="micro-repeat,branching-flora,threshold-edge");p.add_argument("--out",default="pattern.svg");a=p.parse_args()
 svg=pattern(a.seed,[x for x in a.meanings.split(",") if x],[x for x in a.principles.split(",") if x]);open(a.out,"w",encoding="utf8").write(svg);print(a.out)
