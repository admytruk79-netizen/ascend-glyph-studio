#!/usr/bin/env python3
"""ASCEND exact-vector pipeline.
Preserves source topology as compound filled paths; never smooths/symmetrizes.
Raster source remains authority. Outputs SVG plus verification metrics.
"""
from pathlib import Path
import cv2, json, hashlib, numpy as np

def vectorize(src:Path,out:Path,threshold=210):
 im=cv2.imread(str(src),cv2.IMREAD_GRAYSCALE)
 if im is None: raise FileNotFoundError(src)
 mask=(im<threshold).astype(np.uint8)*255
 contours,h=cv2.findContours(mask,cv2.RETR_TREE,cv2.CHAIN_APPROX_NONE)
 parts=[]
 for c in contours:
  if cv2.contourArea(c)<1: continue
  pts=c[:,0,:]
  parts.append("M "+" L ".join(f"{int(x)} {int(y)}" for x,y in pts)+" Z")
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {im.shape[1]} {im.shape[0]}"><path d="{" ".join(parts)}" fill="currentColor" fill-rule="evenodd"/></svg>'
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(svg)
 return mask,svg

def verify(source_mask,svg_render):
 a=source_mask>0;b=svg_render>0
 inter=np.logical_and(a,b).sum();union=np.logical_or(a,b).sum()
 return {"iou":float(inter/union if union else 1),"pixelDifference":float(np.not_equal(a,b).mean())}

# Rendering SVG back to raster is deliberately a separate adapter/gate.
# A vector is not promoted merely because this script emitted it.
