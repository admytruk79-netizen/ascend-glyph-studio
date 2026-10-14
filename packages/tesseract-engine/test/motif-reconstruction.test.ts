import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {assertMotifGraph,transformMotifPoint} from '../src/motif-graph';
import {decomposeAnnotatedMotif,reconstructMotif,measureMotifStructure,assembleAscendMotif} from '../src/motif-reconstruction';
import {deriveConstructionEnvelope} from '../src/construction-envelope';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';

describe('annotated motif baseline (not trained image decomposition)',()=>{
 it('roundtrips deterministic nested connected repeats with provenance',()=>{
  const original=connectedMotifFixture(),graph=decomposeAnnotatedMotif(original);
  expect(graph).toEqual(original);expect(graph).not.toBe(original);
  expect(reconstructMotif(graph)).toEqual(reconstructMotif(connectedMotifFixture()));
  expect(measureMotifStructure(graph)).toEqual({junctionCount:3,brokenJunctions:0,repeatCount:1,brokenRepeats:0,nestedRelations:1,negativeSpaceViolations:0});
  expect(reconstructMotif(graph)[0]).toMatchObject({path:[{x:20,y:45},{x:20,y:20}]});
 });
 it('detects broken junctions and repeats and crossing protected space',()=>{
  const g=connectedMotifFixture();g.nodes.find(n=>n.id==='crown0')!.transform.xMm=4;
  g.nodes.find(n=>n.id==='a2')!.transform.xMm+=7;
  g.nodes.find(n=>n.id==='trunk0')!.geometry!.paths=[[{x:0,y:20},{x:0,y:45}]];
  expect(measureMotifStructure(g)).toMatchObject({brokenJunctions:1,brokenRepeats:1,negativeSpaceViolations:1});
 });
 it('composes reflection, anisotropic scale, rotation and nested translation',()=>{
  const g=connectedMotifFixture(),n=g.nodes.find(n=>n.id==='trunk0')!;
  n.transform={xMm:3,yMm:4,scaleX:2,scaleY:3,reflectX:true,rotationDeg:90};
  const p=transformMotifPoint(g,n.id,{x:1,y:2});expect(p.x).toBeCloseTo(17);expect(p.y).toBeCloseTo(22);
 });
 it.each(['unknown','restricted'] as const)('rejects %s permission',status=>{
  const g=connectedMotifFixture();g.provenance[0].permission.status=status;expect(()=>assertMotifGraph(g)).toThrow('permission');
 });
 it('rejects restricted cultural access, missing evidence and malformed graph',()=>{
  const mutations=[(g:ReturnType<typeof connectedMotifFixture>)=>{g.provenance[0].access='sacred-restricted';},
   (g:ReturnType<typeof connectedMotifFixture>)=>{g.nodes[2].evidence=[];},
   (g:ReturnType<typeof connectedMotifFixture>)=>{g.nodes[2].parentId='trunk0';},
   (g:ReturnType<typeof connectedMotifFixture>)=>{g.nodes[3].geometry!.ports.tip.x=NaN;},
   (g:ReturnType<typeof connectedMotifFixture>)=>{g.provenance[0].originalSha256='invalid';}];
  for(const mutate of mutations){const g=connectedMotifFixture();mutate(g);expect(()=>assertMotifGraph(g)).toThrow();}
 });
 it('canonical bridge requires explicit mapping and preserves source geometry',()=>{
  const g=connectedMotifFixture(),snapshot=JSON.stringify(ASCEND_PRIMITIVES);
  for(const n of g.nodes.filter(n=>n.kind==='element'))n.transform.scaleX=n.transform.scaleY=.08;
  const map=Object.fromEntries(g.nodes.filter(n=>n.kind==='element').map(n=>[n.id,'axis']));
  const result=assembleAscendMotif(g,map,deriveConstructionEnvelope(undefined,'embroidery'));
  expect(result.state).toBe('REFERENCE');expect(result.productionObjects).toHaveLength(6);expect(result.stitchObjects).toHaveLength(24);expect(result.job.validation.valid).toBe(false);expect(result.job.validation.errors).toContain('motif-canonical-layout-unvalidated');
  expect(JSON.stringify(ASCEND_PRIMITIVES)).toBe(snapshot);
  expect(()=>assembleAscendMotif(g,{},deriveConstructionEnvelope(undefined,'embroidery'))).toThrow('mapping');
  g.nodes[3].transform.reflectX=true;expect(()=>assembleAscendMotif(g,map,deriveConstructionEnvelope(undefined,'embroidery'))).toThrow('reflection');
 });
});
