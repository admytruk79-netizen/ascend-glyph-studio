import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {composeReferenceMotifFields,type MotifCompositionField} from '../src/motif-composition-layout';
import {layoutReferenceMotifRegion} from '../src/motif-region-layout';
import {reconstructMotif} from '../src/motif-reconstruction';
const field=(id:string,xMm:number,yMm:number):MotifCompositionField=>({id,xMm,yMm,source:connectedMotifFixture(),
 layout:{id,widthMm:100,heightMm:80,columns:1,rows:1,gapMm:5,marginMm:5}});
describe('separate reference composition fields',()=>{
 it('preserves local fitted geometry at each field offset and keeps sources immutable',()=>{
  const a=field('left',10,10),b=field('right',120,10),before=structuredClone([a,b]);
  const out=composeReferenceMotifFields(230,100,[a,b]);
  const expected=reconstructMotif(layoutReferenceMotifRegion(a.source,a.layout).graph).flatMap(o=>o.kind==='fill'?o.polygon:o.path).map(p=>({x:p.x+10,y:p.y+10}));
  const actual=reconstructMotif(out.graph).filter(o=>o.id.startsWith('left:')).flatMap(o=>o.kind==='fill'?o.polygon:o.path);
  expect(actual).toEqual(expected);expect([a,b]).toEqual(before);
  const localSpace=layoutReferenceMotifRegion(a.source,a.layout).graph.negativeSpace;
  expect(out.graph.negativeSpace.slice(0,localSpace.length)).toEqual(localSpace.map(r=>({...r,xMm:r.xMm+10,yMm:r.yMm+10})));
  expect(out.structure.brokenJunctions).toBe(0);expect(out.clearance.clearanceViolations).toHaveLength(0);
  expect(out.graph.provenance).toHaveLength(1);expect(out.productionApproved).toBe(false);
 });
 it('rejects overlapping reservations, duplicate fields and an out-of-bounds field',()=>{
  expect(()=>composeReferenceMotifFields(230,100,[field('a',0,0),field('b',50,0)])).toThrow('overlapping-fields');
  expect(()=>composeReferenceMotifFields(230,100,[field('a',0,0),field('a',120,0)])).toThrow('field-id');
  expect(()=>composeReferenceMotifFields(100,80,[field('a',1,0)])).toThrow('field-envelope');
 });
 it('rejects incompatible evidence sharing a provenance identifier',()=>{
  const a=field('a',0,0),b=field('b',120,0);b.source.provenance[0].creator='Different source author';
  expect(()=>composeReferenceMotifFields(230,100,[a,b])).toThrow('conflicting-provenance');
 });
});
