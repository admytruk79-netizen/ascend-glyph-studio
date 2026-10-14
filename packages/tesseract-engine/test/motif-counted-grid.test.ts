import {describe,it,expect} from 'vitest';
import {calibrateCountedFabricGrid} from '../src/motif-counted-grid';
const grid={warpThreads:32,weftThreads:25,measuredWidthMm:20,measuredHeightMm:20,source:'Honchar KN-444',locator:'PDF page 6'};
describe('counted fabric calibration',()=>{
 it('preserves unequal warp and weft pitch rather than assuming square cells',()=>{
  const c=calibrateCountedFabricGrid(grid);
  expect(c.xPitchMm).toBe(.625);expect(c.yPitchMm).toBe(.8);
  expect(c.point(32,25)).toEqual({x:20,y:20});
  expect(c.point(10,10)).toEqual({x:6.25,y:8});
  expect(c.stitchCount).toBeNull();expect(c.productionApproved).toBe(false);
 });
 it('rejects missing documentary calibration and nonphysical measurements',()=>{
  for(const patch of [{warpThreads:0},{weftThreads:2.5},{measuredWidthMm:Infinity},{measuredHeightMm:-1},{locator:' '}])
   expect(()=>calibrateCountedFabricGrid({...grid,...patch})).toThrow('invalid-calibration');
 });
 it('rejects nonfinite coordinates and snapshots pitch independently of input mutation',()=>{
  const input={...grid},c=calibrateCountedFabricGrid(input);input.warpThreads=100;
  expect(c.point(32,25)).toEqual({x:20,y:20});
  expect(()=>c.point(NaN,2)).toThrow('invalid-coordinate');
 });
});
