import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {pigmentUnionMask,fillPigmentPinholes} from '../src/motif-pigment-backing';
import {rasterizeObservedContours} from '../src/motif-contour-rasterization';
it('matches the existing even-odd rasterizer on actual source colour contours',()=>{
 const library=JSON.parse(readFileSync('../../data/research/motif-parts-v2/library.json','utf8'));
 for(const id of ['flower-fan31','flower-cup37','leaf-olive']){
  const p=library.pieces.find((p:any)=>p.id===id),expected=new Uint8Array(p.width*p.height);
  for(const l of p.layers){const m=rasterizeObservedContours(l.graph,p.width,p.height);m.forEach((v,i)=>{if(v)expected[i]=1;});}
  expect(pigmentUnionMask(p.layers.map((l:any)=>l.graph),p.width,p.height)).toEqual(expected);
  const moved=structuredClone(p.layers[0].graph);moved.nodes[0].transform.xMm=1;expect(()=>pigmentUnionMask([moved],p.width,p.height)).toThrow('pigment-backing:source-transform');
 }
});
it('fills small enclosed pinholes while preserving open petal notches and larger holes',()=>{
 const mask=new Uint8Array(15*15).fill(1);
 // A boundary-connected notch and an enclosed large opening must survive.
 for(let y=0;y<7;y++)mask[y*15+3]=0;
 for(let y=8;y<13;y++)for(let x=8;x<13;x++)mask[y*15+x]=0;
 mask[5*15+10]=0;
 const original=mask.slice(),r=fillPigmentPinholes(mask,15,15);
 expect(r.filledHoles).toBe(1);expect(r.filledPixels).toBe(1);expect(r.mask[5*15+10]).toBe(1);
 expect(r.mask[3]).toBe(0);expect(r.mask[12*15+12]).toBe(0);expect(mask).toEqual(original);
 expect(fillPigmentPinholes(mask,15,15,0).mask).toEqual(mask);
 expect(()=>fillPigmentPinholes(mask,14,15)).toThrow('pigment-backing:mask');
});
