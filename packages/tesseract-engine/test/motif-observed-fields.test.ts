import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {graphFromObservedFields,type ObservedFieldAnnotations} from '../src/motif-observed-fields';
import type {ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {measureMotifStructure,reconstructMotif} from '../src/motif-reconstruction';
const fixture=()=>({a:JSON.parse(readFileSync('../../data/research/motif-annotations/cleveland-117038-lower-diamond-v1.json','utf8')) as ObservedMotifAnnotations,
 l:JSON.parse(readFileSync('../../data/research/motif-annotations/cleveland-117038-fields-v1.json','utf8')) as ObservedFieldAnnotations});
it('retains six fields, nested source contours and protected neck space without inventing band motifs',()=>{
 const {a,l}=fixture(),before=structuredClone({a,l}),g=graphFromObservedFields(a,l,630);
 expect(g.nodes.filter(n=>n.kind==='region')).toHaveLength(6);expect(g.nodes.filter(n=>n.kind==='element')).toHaveLength(3);
 expect(measureMotifStructure(g).nestedRelations).toBe(2);expect(measureMotifStructure(g).negativeSpaceViolations).toBe(0);
 expect(reconstructMotif(g).map(o=>o.kind==='run'?o.path:[])).toEqual(a.elements.map(e=>e.paths[0].map(([x,y])=>({x,y}))));
 expect({a,l}).toEqual(before);
});
it('rejects overlapping fields, protected-space occupation and unsupported element assignments',()=>{
 const {a,l}=fixture();const overlap=structuredClone(l);overlap.fields[1].boxPx=structuredClone(overlap.fields[0].boxPx);
 expect(()=>graphFromObservedFields(a,overlap)).toThrow('layout');
 const occupied=structuredClone(l);occupied.protectedSpaces[0].boxPx=structuredClone(occupied.fields[0].boxPx);
 expect(()=>graphFromObservedFields(a,occupied)).toThrow('layout');
 const missing=structuredClone(l);missing.fields.at(-1)!.elementIds.pop();expect(()=>graphFromObservedFields(a,missing)).toThrow('layout');
 const duplicate=structuredClone(l);duplicate.fields[0].elementIds=['outer-diamond'];expect(()=>graphFromObservedFields(a,duplicate)).toThrow('layout');
});
it('rejects geometry outside its assigned field and parent/child assignments in different fields',()=>{
 const {a,l}=fixture(),outside=structuredClone(a);outside.elements[0].paths[0][0]=[10,10];
 expect(()=>graphFromObservedFields(outside,l)).toThrow('layout');
 const split=structuredClone(l);split.fields.at(-1)!.elementIds=split.fields.at(-1)!.elementIds.filter(id=>id!=='centre-diamond');split.fields[0].elementIds=['centre-diamond'];
 expect(()=>graphFromObservedFields(a,split)).toThrow('layout');
});
