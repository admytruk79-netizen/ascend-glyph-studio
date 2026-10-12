import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {fitMotifRelationModel,motifPairFeatures,motifRelationTrainingRows,predictMotifRelation,rankMotifRelationCandidates,MOTIF_RELATION_FEATURES,type MotifRelationTrainingRow} from '../src/motif-relation-learning';
const graph=()=>{const a:ObservedMotifAnnotations=JSON.parse(readFileSync('../../data/research/motif-annotations/neon-plate27-bouquet-v1.json','utf8'));return graphFromObservedAnnotations(a,a.image.width);};
const rows=():MotifRelationTrainingRow[]=>['none','junction','nest'].flatMap((label,i)=>Array.from({length:5},(_,j)=>{
 const features=Array(MOTIF_RELATION_FEATURES.length).fill(0);features[4]=Number(i===2);features[8]=features[9]=Number(i===1);features[10]=Number(i===1);features[0]=j/100;
 return {from:'a',to:'b',features,label:label as MotifRelationTrainingRow['label']};
}));
describe('trained motif relationship assistance',()=>{
 it('fits deterministic nonzero weights, reduces loss and predicts a withheld synthetic feature',()=>{
  const input=rows(),before=structuredClone(input),m=fitMotifRelationModel(input,{epochs:500});
  expect(m.weights.flat().some(w=>Math.abs(w)>.1)).toBe(true);
  expect(m.lossTrace.at(-1)!.loss).toBeLessThan(m.lossTrace[0].loss);
  const x=[...input[6].features];x[0]=.025;
  expect(predictMotifRelation(m,x).label).toBe('junction');
  expect(fitMotifRelationModel(input,{epochs:500})).toEqual(m);expect(input).toEqual(before);
 });
 it('uses geometry/ports without leaking declared labels into features and preserves scale',()=>{
  const g=graph(),features=motifPairFeatures(g),without=structuredClone(g);without.relations=[];
  expect(motifPairFeatures(without)).toEqual(features);
  const scaled=structuredClone(g);scaled.widthMm*=3;scaled.heightMm*=3;
  const root=scaled.nodes.find(n=>n.kind==='composition')!;root.transform.scaleX*=3;root.transform.scaleY*=3;
  const next=motifPairFeatures(scaled);expect(next.length).toBe(features.length);
  next.forEach((r,i)=>r.features.forEach((v,j)=>expect(v).toBeCloseTo(features[i].features[j],10)));
 });
 it('retains directed nesting, symmetric contacts and never mutates a graph when ranking',()=>{
  const g=graph(),before=structuredClone(g),r=motifRelationTrainingRows(g);
  expect(r.filter(x=>x.label==='junction')).toHaveLength(14);expect(r.filter(x=>x.label==='nest')).toHaveLength(6);
  const m=fitMotifRelationModel(r,{epochs:100}),ranked=rankMotifRelationCandidates(g,m);
  expect(ranked).toHaveLength(14*13);expect(g).toEqual(before);expect(ranked.every(p=>p.productionApproved===false)).toBe(true);
 });
 it('does not predict a class absent from the training split and rejects invalid models/features',()=>{
  const m=fitMotifRelationModel(rows().filter(r=>r.label!=='junction'),{epochs:100});
  expect(predictMotifRelation(m,rows()[6].features).probabilities.junction).toBe(0);
  expect(()=>predictMotifRelation({...m,productionApproved:true} as any,rows()[0].features)).toThrow('model');
  const corrupt=structuredClone(m);corrupt.weights[0][0]=NaN;
  expect(()=>predictMotifRelation(corrupt,rows()[0].features)).toThrow('model');
  expect(()=>predictMotifRelation(m,[NaN])).toThrow('features');
 });
});
