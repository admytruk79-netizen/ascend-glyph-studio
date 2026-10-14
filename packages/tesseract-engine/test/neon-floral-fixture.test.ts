import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {reconstructMotif,measureMotifStructure} from '../src/motif-reconstruction';
import {measureMotifClearance} from '../src/motif-clearance';
const annotation=()=>JSON.parse(readFileSync('../../data/research/motif-annotations/neon-plate37-connected-floral-v1.json','utf8')) as ObservedMotifAnnotations;
describe('Neon-selected Ukrainian connected floral reference',()=>{
 it('retains the source identity, thirteen observed parts, eight contacts and four insets',()=>{
  const a=annotation(),g=graphFromObservedAnnotations(a,1280);
  const bytes=readFileSync('../../data/research/motif-references/commons-96737753/source.jpg');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.provenance.originalSha256);
  expect(g.nodes.filter(n=>n.kind==='element')).toHaveLength(13);
  expect(measureMotifStructure(g)).toMatchObject({junctionCount:8,brokenJunctions:0,nestedRelations:4});
  expect(measureMotifClearance(g)).toMatchObject({portsOffPath:[],outsideEnvelope:[],clearanceViolations:[]});
  expect(g.provenance[0].culturalContext).toContain('Ukrainian');
  expect(g.provenance[0].community).toBeNull();
  expect(g.nodes.every(n=>!n.geometry||n.geometry.namespace==='reference')).toBe(true);
 });
 it('reconstructs the supplied draft landmarks and exposes two broken stem seams under displacement',()=>{
  const a=annotation(),g=graphFromObservedAnnotations(a,1280);
  const points=reconstructMotif(g).flatMap(o=>o.kind==='fill'?o.polygon:o.path);
  expect(points).toEqual(a.elements.flatMap(e=>e.paths.flatMap(p=>p.map(([x,y])=>({x,y})))));
  g.nodes.find(n=>n.id==='element:stem-bud')!.transform.xMm+=3;
  expect(measureMotifStructure(g).brokenJunctions).toBe(2);
 });
 it('rejects an unreviewed permission state and an inset moved outside its flower',()=>{
  const a=annotation();a.provenance.permission.status='unknown';
  expect(()=>graphFromObservedAnnotations(a)).toThrow('permission');
  const b=annotation();b.elements.find(e=>e.id==='flower-left-inset')!.paths=[[[100,100],[110,100],[100,110],[100,100]]];
  expect(()=>graphFromObservedAnnotations(b)).toThrow('unsupported-containment');
 });
});
