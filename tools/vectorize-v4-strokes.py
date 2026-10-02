#!/usr/bin/env python3
"""V4.1 stroke reconstruction for thin-line ASCEND glyphs.
Uses the locked crop background itself to isolate ink; avoids Otsu classifying parchment texture as glyph.
"""
from pathlib import Path
import cv2, json, numpy as np
from skimage.morphology import skeletonize
from scipy.ndimage import distance_transform_edt

def source_mask(path:Path, ink_delta:float=25.0):
 g=cv2.imread(str(path),cv2.IMREAD_GRAYSCALE)
 if g is None: raise FileNotFoundError(path)
 h,w=g.shape
 border=np.concatenate((g[:max(2,h//12),:].ravel(),g[-max(2,h//12):,:].ravel(),g[:, :max(2,w//12)].ravel(),g[:, -max(2,w//12):].ravel()))
 background=float(np.median(border))
 # The atlas is warm/light; glyph ink is materially darker than its local parchment.
 mask=g < (background-ink_delta)
 # Remove isolated compression/texture specks without altering connected glyph strokes.
 n,labels,stats,_=cv2.connectedComponentsWithStats(mask.astype(np.uint8),8)
 keep=np.zeros_like(mask)
 for i in range(1,n):
  if stats[i,cv2.CC_STAT_AREA]>=3: keep[labels==i]=True
 return keep,background

def neighbors(p,pts):
 x,y=p
 return [(x+a,y+b) for a in (-1,0,1) for b in (-1,0,1) if (a or b) and (x+a,y+b) in pts]

def graph_pixels(sk):
 ys,xs=np.nonzero(sk);pts=set(zip(xs.tolist(),ys.tolist()))
 nodes={p for p in pts if len(neighbors(p,pts))!=2}
 if not nodes and pts:nodes={next(iter(pts))}
 return pts,nodes

def trace_edges(pts,nodes):
 seen=set();edges=[]
 for n in nodes:
  for q in neighbors(n,pts):
   key=tuple(sorted((n,q)))
   if key in seen:continue
   path=[n];prev=n;cur=q;seen.add(key)
   while True:
    path.append(cur)
    if cur in nodes and cur!=n:break
    nxt=[r for r in neighbors(cur,pts) if r!=prev and tuple(sorted((cur,r))) not in seen]
    if not nxt:break
    prev,cur=cur,nxt[0];seen.add(tuple(sorted((prev,cur))))
   if len(path)>1:edges.append(path)
 return edges

def vectorize(src:Path,out:Path,ink_delta:float=25.0):
 mask,bg=source_mask(src,ink_delta);sk=skeletonize(mask);dist=distance_transform_edt(mask)
 pts,nodes=graph_pixels(sk);edges=trace_edges(pts,nodes)
 widths=[2*dist[y,x] for x,y in pts if dist[y,x]>0]
 sw=float(np.median(widths)) if widths else 1.0
 paths=[]
 for e in edges:
  d="M "+" L ".join(f"{x} {y}" for x,y in e)
  paths.append(f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="{sw:.3f}" stroke-linecap="round" stroke-linejoin="round"/>')
 h,w=mask.shape
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{"".join(paths)}</svg>'
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(svg)
 meta={"method":"v4.1-centerline","background":bg,"inkDelta":ink_delta,"width":w,"height":h,"strokeWidth":sw,"sourceInkPixels":int(mask.sum()),"skeletonPixels":int(sk.sum()),"nodes":len(nodes),"edges":len(edges),"status":"candidate-needs-renderback"}
 out.with_suffix(".json").write_text(json.dumps(meta,indent=2))
 return meta
