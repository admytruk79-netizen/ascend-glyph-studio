import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {reconstructMotif,measureMotifStructure} from '../src/motif-reconstruction';
const fixture=()=>JSON.parse(readFileSync('../../data/research/motif-annotations/met-445264-coarse-v1.json','utf8')) as ObservedMotifAnnotations;
describe('observed historical annotations',()=>{
 it('preserves every annotated landmark in reference coordinates and the inset hierarchy',()=>{
  const a=fixture(),g=graphFromObservedAnnotations(a,225),ir=reconstructMotif(g);
  expect(ir.map(o=>o.kind==='fill'?o.polygon:o.path)).toEqual(a.elements.flatMap(e=>e.paths.map(p=>p.map(([x,y])=>({x,y})))));
  expect(measureMotifStructure(g).nestedRelations).toBe(1);
  expect(g.relations.some(r=>r.kind==='junction'||r.kind==='repeat')).toBe(false);
  expect(g.nodes.filter(n=>n.kind==='element')).toHaveLength(7);
  expect(g.provenance[0].transformations.at(-1)?.evidence).toContain('draft');
 });
 it('rejects cycles, missing parent IDs, outside-image landmarks and restricted provenance',()=>{
  const cycle=fixture();cycle.elements[0].parentElementId='upper-inset';expect(()=>graphFromObservedAnnotations(cycle)).toThrow('cycle');
  const missing=fixture();missing.elements[0].parentElementId='absent';expect(()=>graphFromObservedAnnotations(missing)).toThrow('invalid-annotation');
  const outside=fixture();outside.elements[0].paths[0][0][0]=-1;expect(()=>graphFromObservedAnnotations(outside)).toThrow('invalid-annotation');
  const denied=fixture();denied.provenance.permission.status='restricted';expect(()=>graphFromObservedAnnotations(denied)).toThrow('permission');
 });
 it('does not inflate confidence or silently alter the supplied annotations',()=>{
  const a=fixture(),before=structuredClone(a);a.elements[0].confidence=1;
  const g=graphFromObservedAnnotations(a);
  expect(g.nodes.find(n=>n.id==='element:medallion-upper')!.confidence).toBe(.8);
  expect(a.provenance).toEqual(before.provenance);
  expect(graphFromObservedAnnotations(a)).toEqual(g);
 });
});
