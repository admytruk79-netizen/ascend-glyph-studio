import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {partitionObservedMotifPaths} from '../src/motif-path-decomposition';
import {reconstructMotif,measureMotifStructure} from '../src/motif-reconstruction';
describe('explicit path decomposition',()=>{
 const fixture=()=>{const g=connectedMotifFixture();g.relations=[];for(const n of g.nodes)if(n.geometry)n.geometry.ports={};return g;};
 it('preserves the geometry and adds a continuous seam without mutating input',()=>{
  const g=fixture(),copy=structuredClone(g),split=partitionObservedMotifPaths(g,[{elementId:'crown0',cuts:[1],evidence:'authored vertex partition'}]);
  expect(g).toEqual(copy);
  const parts=reconstructMotif(split).filter(p=>p.id.startsWith('crown0:part'));
  expect(parts.map(p=>p.kind==='fill'?p.polygon:p.path)).toEqual([[{x:10,y:8},{x:20,y:20}],[{x:20,y:20},{x:30,y:8}]]);
  expect(measureMotifStructure(split)).toMatchObject({junctionCount:1,brokenJunctions:0});
 });
 it('retains a closed contour seam and every spatial nest target',()=>{
  const g=fixture(),n=g.nodes.find(n=>n.id==='crown0')!;
  n.geometry!.paths=[[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:0}]];n.geometry!.ports={};
  g.relations=[{kind:'nest',from:'field',to:n.id}];
  const split=partitionObservedMotifPaths(g,[{elementId:n.id,cuts:[1,2],evidence:'synthetic contour control'}]);
  expect(measureMotifStructure(split)).toMatchObject({junctionCount:3,brokenJunctions:0,nestedRelations:3});
 });
 it('rejects constraints requiring a remap, unordered cuts and an occupied generated ID',()=>{
  expect(()=>partitionObservedMotifPaths(connectedMotifFixture(),[{elementId:'crown0',cuts:[1],evidence:'x'}])).toThrow('remapping-required');
  const g=fixture();g.nodes.find(n=>n.id==='crown0')!.geometry!.ports={};
  expect(()=>partitionObservedMotifPaths(g,[{elementId:'crown0',cuts:[1,1],evidence:'x'}])).toThrow('cuts');
  g.nodes.push({...structuredClone(g.nodes.find(n=>n.id==='crown0')!),id:'crown0:part-0'});
  expect(()=>partitionObservedMotifPaths(g,[{elementId:'crown0',cuts:[1],evidence:'x'}])).toThrow('id-collision');
 });
});
