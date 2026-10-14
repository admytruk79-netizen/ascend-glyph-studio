import {describe,it,expect} from 'vitest';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {inferAnnotatedRepeatLattices} from '../src/motif-repeat-inference';
import {decomposeAnnotatedMotif,measureMotifStructure,reconstructMotif} from '../src/motif-reconstruction';
const fixture=()=>{const g=connectedMotifFixture();g.relations=g.relations.filter(r=>r.kind!=='repeat');return g;};
describe('translated annotated vector repeat inference',()=>{
 it('recovers withheld repeat annotation deterministically without changing reference geometry',()=>{
  const input=fixture(),before=JSON.stringify(input),graph=inferAnnotatedRepeatLattices(input);
  expect(graph.relations.find(r=>r.kind==='repeat')).toMatchObject({members:['a0','a1','a2'],stepMm:{x:35,y:0},inference:{method:'translated-annotated-vectors-v1',confidence:1,evidence:['authored-annotation:v1']}});
  expect(measureMotifStructure(graph)).toMatchObject({repeatCount:1,brokenRepeats:0});
  expect(reconstructMotif(graph)).toEqual(reconstructMotif(input));expect(JSON.stringify(input)).toBe(before);
  expect(graph).toEqual(inferAnnotatedRepeatLattices(fixture()));
  expect(decomposeAnnotatedMotif(input,{inferRepeats:true})).toEqual(graph);
  expect(graph.provenance[0].originalSha256).toBe(input.provenance[0].originalSha256);
  expect(graph.provenance[0].transformations.at(-1)?.operation).toBe('translated-vector-lattice:a0,a1,a2');
 });
 it('does not merge geometrically identical motifs from different attributed sources',()=>{
  const input=fixture();input.provenance.push({...structuredClone(input.provenance[0]),id:'different-source',source:'fixture://distinct-community',community:'Distinct fixture community',culturalContext:'Distinct synthetic source context'});
  input.nodes.find(n=>n.id==='a2')!.provenanceId='different-source';
  expect(inferAnnotatedRepeatLattices(input).relations.some(r=>r.kind==='repeat')).toBe(false);
 });
 it('does not infer a lattice for irregular positions or different vector families',()=>{
  const irregular=fixture();irregular.nodes.find(n=>n.id==='a2')!.transform.xMm+=3;
  expect(inferAnnotatedRepeatLattices(irregular).relations.some(r=>r.kind==='repeat')).toBe(false);
  const different=fixture();different.nodes.find(n=>n.id==='crown2')!.geometry!.paths[0][0].x-=1;
  expect(inferAnnotatedRepeatLattices(different).relations.some(r=>r.kind==='repeat')).toBe(false);
 });
 it('preserves existing annotations instead of duplicating or overriding them',()=>{
  const graph=connectedMotifFixture();expect(inferAnnotatedRepeatLattices(graph)).toEqual(graph);
 });
 it('does not merge matching outlines with different connector ports or junction topology',()=>{
  const ports=fixture();ports.nodes.find(n=>n.id==='trunk2')!.geometry!.ports.tip.x=1;
  expect(inferAnnotatedRepeatLattices(ports).relations.some(r=>r.kind==='repeat')).toBe(false);
  const topology=fixture();topology.relations=topology.relations.filter(r=>r.kind!=='junction'||r.from!=='trunk2');
  expect(inferAnnotatedRepeatLattices(topology).relations.some(r=>r.kind==='repeat')).toBe(false);
 });
 it('caps inference confidence at input evidence confidence',()=>{
  const input=fixture();input.nodes.find(n=>n.id==='trunk2')!.confidence=.6;
  const r=inferAnnotatedRepeatLattices(input).relations.find(r=>r.kind==='repeat');
  expect(r?.kind==='repeat'?r.inference?.confidence:undefined).toBe(.6);
  input.provenance[0].confidence=.4;
  const sourceBounded=inferAnnotatedRepeatLattices(input).relations.find(r=>r.kind==='repeat');
  expect(sourceBounded?.kind==='repeat'?sourceBounded.inference?.confidence:undefined).toBe(.4);
 });
});
