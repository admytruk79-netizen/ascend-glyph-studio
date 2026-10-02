#!/usr/bin/env python3
"""V4 stroke reconstruction for thin-line ASCEND glyphs.
Input is a locked source crop. Output is centerline SVG + metrics metadata.
Requires opencv-python and scikit-image.
"""
from pathlib import Path
import cv2, json, numpy as np
from skimage.morphology import skeletonize
from scipy.ndimage import distance_transform_edt

def source_mask(path:Path):
 g=cv2.imread(str(path),cv2.IMREAD_GRAYSCALE)
 if g is None: raise FileNotFoundError(path)
 # local Otsu; source crop is authority, threshold only isolates ink
 _,m=cv2.threshold(g,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)
 return m>0

def graph_pixels(sk):
 ys,xs=np.nonzero(sk); pts=set(zip(xs.tolist(),ys.tolist()))
 def deg(p):
  x,y=p; return sum((x+dx,y+dy) in pts for dx in (-1,0,1) for dy in (-1,0,1) if dx or dy)
 nodes={p for p in pts if deg(p)!=2}
 if not nodes and pts: nodes={next(iter(pts))}
 return pts,nodes

def trace_edges(pts,nodes):
 seen=set(); edges=[]
 for n in nodes:
  x,y=n
  for dx in (-1,0,1):
   for dy in (-1,0,1):
    q=(x+dx,y+dy)
    if (dx or dy) and q in pts and tuple(sorted((n,q))) not in seen:
     path=[n]; prev=n; cur=q; seen.add(tuple(sorted((prev,cur))))
     while True:
      path.append(cur)
      if cur in nodes and cur!=n: break
      nxt=[r for r in ((cur[0]+a,cur[1]+b) for a in (-1,0,1) for b in (-1,0,1) if a or b) if r in pts and r!=prev and tuple(sorted((cur,r))) not in seen]
      if not nxt: break
      prev,cur=cur,nxt[0];seen.add(tuple(sorted((prev,cur))))
     if len(path)>1: edges.append(path)
 return edges

def vectorize(src:Path,out:Path):
 mask=source_mask(src); sk=skeletonize(mask); dist=distance_transform_edt(mask)
 pts,nodes=graph_pixels(sk); edges=trace_edges(pts,nodes)
 widths=[2*dist[y,x] for x,y in pts if dist[y,x]>0]
 sw=float(np.median(widths)) if widths else 1.0
 paths=[]
 for e in edges:
  d="M "+" L ".join(f"{x} {y}" for x,y in e)
  paths.append(f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="{sw:.3f}" stroke-linecap="round" stroke-linejoin="round"/>')
 h,w=mask.shape
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{"".join(paths)}</svg>'
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(svg)
 meta={"method":"v4-centerline","width":w,"height":h,"strokeWidth":sw,"skeletonPixels":int(sk.sum()),"nodes":len(nodes),"edges":len(edges),"status":"candidate-needs-renderback"}
 out.with_suffix(".json").write_text(json.dumps(meta,indent=2))
 return meta
