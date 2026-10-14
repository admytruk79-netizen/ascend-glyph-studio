import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {analyseMotifInterlace} from '../src/motif-interlace';
import {measureMotifClearance} from '../src/motif-clearance';
const annotation=():ObservedMotifAnnotations=>JSON.parse(readFileSync('../../data/research/motif-annotations/met-388374-crossing-detail-v1.json','utf8'));
describe('reference strand crossings',()=>{
 it('detects the reviewed source crossing without inferring order or changing clearance',()=>{
  const g=graphFromObservedAnnotations(annotation(),2907),before=structuredClone(g),r=analyseMotifInterlace(g);
  expect(r.candidates).toHaveLength(1);expect(r.crossings).toHaveLength(0);expect(r.unresolved).toHaveLength(1);
  const c=r.candidates[0];
  const reviewed=analyseMotifInterlace(g,[{id:'crossing-1',over:c.a,under:c.b,at:c.at,toleranceMm:0,evidence:'Draft source-image review: interrupted under strand.'}]);
  expect(reviewed.crossings).toHaveLength(1);expect(reviewed.unresolved).toHaveLength(0);
  expect(measureMotifClearance(g).clearanceViolations).toHaveLength(1);expect(g).toEqual(before);
  expect(reviewed.productionApproved).toBe(false);expect(reviewed.stitchCount).toBeNull();
 });
 it('rejects unsupported order, missing evidence and repeated observations',()=>{
  const g=graphFromObservedAnnotations(annotation(),2907),c=analyseMotifInterlace(g).candidates[0];
  const o={id:'x',over:c.a,under:c.b,at:c.at,toleranceMm:0,evidence:'draft'};
  expect(()=>analyseMotifInterlace(g,[{...o,under:'unknown'}])).toThrow('unsupported');
  expect(()=>analyseMotifInterlace(g,[{...o,evidence:''}])).toThrow('invalid');
  expect(()=>analyseMotifInterlace(g,[o,{...o,id:'y'}])).toThrow('unsupported');
 });
 it('keeps endpoint and collinear contacts ambiguous rather than treating them as crossings',()=>{
  const g=graphFromObservedAnnotations(annotation(),2907),e=g.nodes.filter(n=>n.kind==='element');
  e[0].geometry!.paths=[[{x:0,y:0},{x:10,y:0}]];
  e[1].geometry!.paths=[[{x:10,y:0},{x:10,y:10}]];
  expect(analyseMotifInterlace(g).candidates).toHaveLength(0);expect(analyseMotifInterlace(g).ambiguous.length).toBeGreaterThan(0);
  e[1].geometry!.paths=[[{x:5,y:0},{x:15,y:0}]];
  expect(analyseMotifInterlace(g).candidates).toHaveLength(0);expect(analyseMotifInterlace(g).ambiguous[0].reason).toContain('collinear');
 });
});
