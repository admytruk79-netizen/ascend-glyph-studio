import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {decomposeMotifMask,reconstructMotifMask} from '../src/motif-raster';
const provenance=()=>connectedMotifFixture().provenance[0]!;
describe('reviewed raster baseline',()=>{
 it('preserves a hole, an isolated pixel and two disconnected components',()=>{
  const mask=new Uint8Array(32*32);
  for(let y=4;y<20;y++)for(let x=4;x<20;x++)if(x<7||x>=17||y<7||y>=17)mask[y*32+x]=1;
  mask[28*32+28]=1;
  const result=decomposeMotifMask(mask,32,32,provenance(),100);
  expect(result.graph.nodes.filter(n=>n.kind==='assembly')).toHaveLength(2);
  expect(reconstructMotifMask(result,32,32)).toEqual(mask);
  expect(result.foregroundPixels).toBe(mask.reduce((a,b)=>a+b,0));
  expect(decomposeMotifMask(mask,32,32,provenance(),100)).toEqual(result);
 });
 it('rejects invalid pixels, unverified permission and uncalibrated decoder dimensions',()=>{
  expect(()=>decomposeMotifMask(new Uint8Array(16).fill(2),4,4,provenance(),1)).toThrow('binary-raster');
  const p=provenance();p.permission.status='unknown';
  expect(()=>decomposeMotifMask(new Uint8Array(16),4,4,p,1)).toThrow('permission');
  const result=decomposeMotifMask(new Uint8Array(16),4,4,provenance(),1);
  expect(()=>reconstructMotifMask(result,8,4)).toThrow('decode-dimensions');
 });
 it('does not infer semantic elements or certify canonical geometry',()=>{
  const mask=new Uint8Array(64).fill(1),result=decomposeMotifMask(mask,8,8,provenance(),8);
  expect(result.graph.relations).toEqual([]);
  expect(result.calibration).toBe('reference-normalization');
  expect(result.graph.nodes.at(-1)?.geometry?.namespace).toBe('reference');
  result.graph.nodes.at(-1)!.transform.rotationDeg=90;
  expect(()=>reconstructMotifMask(result,8,8)).toThrow('decode-transform');
 });
});
