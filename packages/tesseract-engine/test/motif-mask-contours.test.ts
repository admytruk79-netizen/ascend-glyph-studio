import {describe,it,expect} from 'vitest';
import {graphFromMotifMaskContours} from '../src/motif-mask-contours';
import {rasterizeObservedContours} from '../src/motif-contour-rasterization';
import {connectedMotifFixture} from '../src/motif-fixtures';
const source=()=>connectedMotifFixture().provenance[0];
describe('mask boundary decomposition',()=>{
 it('reconstructs all 512 binary 3x3 masks including diagonal and self-touching boundaries',()=>{
  for(let bits=0;bits<512;bits++){
   const mask=Uint8Array.from({length:9},(_,i)=>(bits>>i)&1);
   const result=graphFromMotifMaskContours(mask,3,3,source(),7);
   expect(rasterizeObservedContours(result.graph,3,3)).toEqual(mask);
  }
 });
 it('preserves a hole and an isolated component, with exact closed contours',()=>{
  const mask=new Uint8Array(64);for(let y=1;y<6;y++)for(let x=1;x<6;x++)if(x===1||x===5||y===1||y===5)mask[y*8+x]=1;mask[63]=1;
  const result=graphFromMotifMaskContours(mask,8,8,source(),8);
  expect(result).toMatchObject({componentCount:2,loopCount:3,holeCount:1});
  expect(rasterizeObservedContours(result.graph,8,8)).toEqual(mask);
  expect(graphFromMotifMaskContours(mask,8,8,source(),8)).toEqual(result);
  result.graph.nodes.find(n=>n.kind==='element')!.transform.xMm=2;
  expect(result.graph.nodes.find(n=>n.kind==='assembly')!.transform.xMm).toBe(0);
 });
 it('rejects non-binary masks, restricted permission and open rasterization contours',()=>{
  expect(()=>graphFromMotifMaskContours(new Uint8Array(4).fill(2),2,2,source())).toThrow('binary-mask');
  const p=source();p.permission.status='restricted';expect(()=>graphFromMotifMaskContours(new Uint8Array(4),2,2,p)).toThrow('permission');
  const g=graphFromMotifMaskContours(new Uint8Array(4).fill(1),2,2,source()).graph;
  g.nodes.at(-1)!.geometry!.paths[0].pop();expect(()=>rasterizeObservedContours(g,2,2)).toThrow('open-contour');
 });
});
