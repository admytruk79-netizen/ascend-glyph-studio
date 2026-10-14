import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {measureMotifClearance} from '../src/motif-clearance';
import {decomposeAnnotatedMotif,reconstructMotif,assembleAscendMotif} from '../src/motif-reconstruction';
import {deriveConstructionEnvelope} from '../src/construction-envelope';
import {MACHINE_TEMPLATES} from '../src/machine-template';

describe('reference motif centreline clearance',()=>{
 it('preserves deliberate bounded junctions without false collisions',()=>{
  const score=measureMotifClearance(connectedMotifFixture());
  expect(score.clearanceViolations).toEqual([]);expect(score.portsOffPath).toEqual([]);expect(score.outsideEnvelope).toEqual([]);
  expect(score.minimumCenterlineGapMm).toBeGreaterThanOrEqual(2);
 });
 it('allows declared touching junctions at zero gap but rejects undeclared crossings',()=>{
  const g=connectedMotifFixture();g.minGapMm=0;
  expect(measureMotifClearance(g).clearanceViolations).toEqual([]);
  g.relations=g.relations.filter(r=>r.kind!=='junction');
  expect(measureMotifClearance(g).clearanceViolations).toHaveLength(3);
 });
 it('detects repeats closer than the declared minimum gap',()=>{
  const g=connectedMotifFixture();g.nodes.find(n=>n.id==='a1')!.transform.xMm=41;
  const score=measureMotifClearance(g);expect(score.minimumCenterlineGapMm).toBeCloseTo(1);
  expect(score.clearanceViolations.some(v=>v.from==='crown0'&&v.to==='crown1')).toBe(true);
 });
 it('detects crossings with both segment endpoints away from the other line',()=>{
  const g=connectedMotifFixture();g.nodes.find(n=>n.id==='a1')!.transform.xMm=20;
  g.nodes.find(n=>n.id==='trunk1')!.geometry!.paths=[[{x:-10,y:12},{x:10,y:12}]];
  expect(measureMotifClearance(g).clearanceViolations).toContainEqual({from:'trunk0',to:'trunk1',centerlineGapMm:0});
 });
 it('does not exempt remote collisions just because elements share a junction',()=>{
  const g=connectedMotifFixture();g.nodes.find(n=>n.id==='crown0')!.geometry!.paths.push([{x:-10,y:12},{x:10,y:12}]);
  expect(measureMotifClearance(g).clearanceViolations).toContainEqual({from:'trunk0',to:'crown0',centerlineGapMm:0});
 });
 it('allows separated nested outlines rather than treating bounding boxes as collisions',()=>{
  const g=connectedMotifFixture();g.relations=g.relations.filter(r=>r.kind!=='junction'||r.from!=='trunk0');
  const box=(s:number)=>[{x:-s,y:-s},{x:s,y:-s},{x:s,y:s},{x:-s,y:s},{x:-s,y:-s}];
  g.nodes.find(n=>n.id==='trunk0')!.geometry!.paths=[box(8)];g.nodes.find(n=>n.id==='crown0')!.geometry!.paths=[box(2)];
  expect(measureMotifClearance(g).clearanceViolations).toEqual([]);
 });
 it('flags off-path named ports and transformed envelope overflow',()=>{
  const g=connectedMotifFixture();g.nodes.find(n=>n.id==='trunk0')!.geometry!.ports.tip={x:1,y:0};
  g.nodes.find(n=>n.id==='a2')!.transform.xMm=125;
  const score=measureMotifClearance(g);expect(score.portsOffPath).toContain('trunk0:tip');
  expect(score.outsideEnvelope).toContain('crown2');expect(score.outsideEnvelope).toContain('trunk2');
 });
 it('rejects unversioned provenance, unknown node/relation types and inherited port names',()=>{
  const mutations=[(g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.provenance[0],{schema:'unknown'}),
   (g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.nodes[2],{kind:'unknown'}),
   (g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.relations[0],{kind:'unknown'}),
   (g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.relations[0],{fromPort:'toString'}),
   (g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.provenance[0],{community:undefined}),
   (g:ReturnType<typeof connectedMotifFixture>)=>Object.assign(g.nodes[2],{parentId:'trunk0'})];
  for(const mutate of mutations){const g=connectedMotifFixture();mutate(g);expect(()=>decomposeAnnotatedMotif(g)).toThrow();}
 });
 it('rejects finite-input transforms whose result overflows',()=>{
  const g=connectedMotifFixture();g.nodes[0].transform.scaleX=Number.MAX_VALUE;
  expect(()=>reconstructMotif(g)).toThrow('transform-overflow');
 });
});

describe('motif bridge machine feasibility',()=>{
 const brother=MACHINE_TEMPLATES['brother-pr1055x-reference'];
 const fixture=()=>{const g=connectedMotifFixture();for(const n of g.nodes.filter(n=>n.kind==='element'))n.transform.scaleX=n.transform.scaleY=.08;return g;};
 const mapping=(g:ReturnType<typeof fixture>)=>Object.fromEntries(g.nodes.filter(n=>n.kind==='element').map(n=>[n.id,'axis']));
 it('passes the selected machine and retains the canonical-layout blocker',()=>{
  const g=fixture();g.widthMm=360;g.heightMm=500;
  const result=assembleAscendMotif(g,mapping(g),deriveConstructionEnvelope(undefined,'embroidery',undefined,{},brother),{machine:brother});
  expect(result.job.validation.valid).toBe(false);
  expect(result.job.validation.errors).toContain('machine-field-exceeded:segmentation-required');
  expect(result.job.validation.errors).toContain('motif-canonical-layout-unvalidated');
 });
 it('rejects a missing or mismatched full template instead of silently bypassing machine checks',()=>{
  const g=fixture(),envelope=deriveConstructionEnvelope(undefined,'embroidery',undefined,{},brother);
  expect(()=>assembleAscendMotif(g,mapping(g),envelope)).toThrow('motif-machine-template-required');
  expect(()=>assembleAscendMotif(g,mapping(g),envelope,{machine:MACHINE_TEMPLATES['tajima-tmbp2-sc-reference']})).toThrow('motif-machine-envelope-mismatch');
 });
 it('reports structurally invalid reference constraints separately from canonical validation',()=>{
  const g=fixture();g.nodes.find(n=>n.id==='a2')!.transform.xMm+=3;
  const result=assembleAscendMotif(g,mapping(g),deriveConstructionEnvelope(undefined,'embroidery'));
  expect(result.referenceStructure.brokenRepeats).toBe(1);expect(result.job.validation.errors).toContain('motif-reference-layout-invalid');
  expect(result.job.validation.valid).toBe(false);
 });
});
