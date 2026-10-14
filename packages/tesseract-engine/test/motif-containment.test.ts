import {describe,it,expect} from 'vitest';
import {assertObservedContainment} from '../src/motif-containment';
const path=(pairs:number[][])=>pairs.map(([x,y])=>({x,y}));
const square=path([[0,0],[10,0],[10,10],[0,10],[0,0]]);
describe('observed contour containment',()=>{
 it('accepts internal paths regardless of outer contour winding',()=>{
  const child=[path([[2,2],[8,8]])];
  expect(()=>assertObservedContainment([square],child)).not.toThrow();
  expect(()=>assertObservedContainment([square.slice().reverse()],child)).not.toThrow();
 });
 it('rejects an outside child and a boundary contact',()=>{
  expect(()=>assertObservedContainment([square],[path([[2,2],[12,2]])])).toThrow('unsupported-containment');
  expect(()=>assertObservedContainment([square],[path([[0,2],[2,2]])])).toThrow('unsupported-containment');
 });
 it('rejects a child segment crossing the gap of a concave parent despite internal endpoints',()=>{
  const u=path([[0,0],[10,0],[10,10],[7,10],[7,3],[3,3],[3,10],[0,10],[0,0]]);
  expect(()=>assertObservedContainment([u],[path([[1,8],[9,8]])])).toThrow('unsupported-containment');
 });
 it('rejects an open, self-crossing or ambiguous multi-outline parent',()=>{
  const child=[path([[2,2],[3,3]])];
  expect(()=>assertObservedContainment([square.slice(0,-1)],child)).toThrow('unsupported-containment');
  expect(()=>assertObservedContainment([path([[0,0],[10,10],[0,10],[10,0],[0,0]])],child)).toThrow('unsupported-containment');
  expect(()=>assertObservedContainment([square,square],child)).toThrow('unsupported-containment');
 });
});
