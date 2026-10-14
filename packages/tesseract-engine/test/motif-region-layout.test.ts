import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {layoutReferenceMotifRegion,type MotifRegionLayout} from '../src/motif-region-layout';
const layout:MotifRegionLayout={id:'reference-panel',widthMm:300,heightMm:120,columns:2,rows:2,gapMm:10,marginMm:8};
describe('garment-region reference layouts',()=>{
 it('preserves contacts, source repeats, negative space and input geometry under uniform placement',()=>{
  const input=connectedMotifFixture(),before=structuredClone(input),result=layoutReferenceMotifRegion(input,layout);
  expect(input).toEqual(before);
  expect(result.structure).toMatchObject({junctionCount:12,brokenJunctions:0,brokenRepeats:0,nestedRelations:4,negativeSpaceViolations:0});
  expect(result.graph.negativeSpace).toHaveLength(4);
  expect(result.clearance).toMatchObject({portsOffPath:[],outsideEnvelope:[],clearanceViolations:[]});
  expect(result.graph.nodes.find(n=>n.id==='tile-0-0:crown0')!.geometry).toEqual(input.nodes.find(n=>n.id==='crown0')!.geometry);
  expect(result.productionApproved).toBe(false);
  expect(layoutReferenceMotifRegion(input,layout)).toEqual(result);
 });
 it('places nonoverlapping footprints within the requested region and declared gaps',()=>{
  const {placements:p}=layoutReferenceMotifRegion(connectedMotifFixture(),layout);
  expect(p).toHaveLength(4);
  for(const box of p){expect(box.xMm).toBeGreaterThanOrEqual(8);expect(box.yMm).toBeGreaterThanOrEqual(8);
   expect(box.xMm+box.widthMm).toBeLessThanOrEqual(292);expect(box.yMm+box.heightMm).toBeLessThanOrEqual(112);}
  expect(p[1].xMm-p[0].xMm-p[0].widthMm).toBeGreaterThanOrEqual(10-1e-8);
  expect(p[2].yMm-p[0].yMm-p[0].heightMm).toBeGreaterThanOrEqual(10-1e-8);
 });
 it('preserves source contacts and protected areas through authored mirrored row alternation',()=>{
  const result=layoutReferenceMotifRegion(connectedMotifFixture(),{...layout,mirrorAlternateRows:true});
  expect(result.placements.map(p=>p.reflected)).toEqual([false,false,true,true]);
  expect(result.structure).toMatchObject({brokenJunctions:0,brokenRepeats:0,negativeSpaceViolations:0});
  expect(result.graph.relations.some(r=>r.kind==='repeat'&&r.stepMm.x<0)).toBe(true);
 });
 it('retains eight observed petal-interior regions in the richer Neon draft',()=>{
  const a=JSON.parse(readFileSync('../../data/research/motif-annotations/neon-plate37-connected-floral-v2.json','utf8')) as ObservedMotifAnnotations;
  const result=layoutReferenceMotifRegion(graphFromObservedAnnotations(a,1280),{id:'neon-cuff-reference',widthMm:180,heightMm:42,columns:2,rows:1,gapMm:6,marginMm:4});
  expect(result.graph.nodes.filter(n=>n.id.includes('petal-inset')&&n.kind==='element')).toHaveLength(16);
  expect(result.structure).toMatchObject({junctionCount:16,brokenJunctions:0,nestedRelations:24});
 });
 it('fails closed for invalid grids, cramped regions and scaling below existing gap requirements',()=>{
  const source=connectedMotifFixture();
  expect(()=>layoutReferenceMotifRegion(source,{...layout,gapMm:0})).toThrow('layout');
  expect(()=>layoutReferenceMotifRegion(source,{...layout,rows:33})).toThrow('layout');
  expect(()=>layoutReferenceMotifRegion(source,{...layout,widthMm:20})).toThrow('field-too-small');
  expect(()=>layoutReferenceMotifRegion(source,{...layout,widthMm:50,heightMm:30,columns:2,rows:1,marginMm:5})).toThrow('reference-constraints');
  const invalid=connectedMotifFixture();invalid.negativeSpace=[];invalid.widthMm=1;
  expect(()=>layoutReferenceMotifRegion(invalid,layout)).toThrow('invalid-reference');
 });
});
