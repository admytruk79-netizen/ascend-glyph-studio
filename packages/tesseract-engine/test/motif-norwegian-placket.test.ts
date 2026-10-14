import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {graphFromObservedFields,type ObservedFieldAnnotations} from '../src/motif-observed-fields';
import type {ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {measureMotifStructure,reconstructMotif} from '../src/motif-reconstruction';
import {inferAnnotatedRepeatLattices} from '../src/motif-repeat-inference';
import {motifRelationTrainingRows} from '../src/motif-relation-learning';
const fixture=()=>({a:JSON.parse(readFileSync('../../data/research/motif-annotations/cleveland-106581-placket-v1.json','utf8')) as ObservedMotifAnnotations,
 l:JSON.parse(readFileSync('../../data/research/motif-annotations/cleveland-106581-fields-v1.json','utf8')) as ObservedFieldAnnotations});
it('binds nine draft contours to the source and preserves all independently placed vertices',()=>{
 const {a,l}=fixture(),image=readFileSync('../../data/research/shirt-image-sources/cleveland-106581/source-print.jpg');
 expect(createHash('sha256').update(image).digest('hex')).toBe(a.provenance.originalSha256);
 const g=graphFromObservedFields(a,l,a.image.width),structure=measureMotifStructure(g);
 expect(g.nodes.filter(n=>n.kind==='element')).toHaveLength(9);expect(structure.nestedRelations).toBe(6);
 expect(structure.negativeSpaceViolations).toBe(0);
 expect(reconstructMotif(g).map(o=>o.kind==='run'?o.path:[])).toEqual(a.elements.map(e=>e.paths[0].map(([x,y])=>({x,y}))));
 expect(g.provenance[0].regionalAttribution?.status).toBe('documented');
});
it('does not force deformed source units into exact repeats or label nesting as contact',()=>{
 const {a,l}=fixture(),g=graphFromObservedFields(a,l,a.image.width),rows=motifRelationTrainingRows(g);
 expect(inferAnnotatedRepeatLattices(g).relations.filter(r=>r.kind==='repeat')).toHaveLength(0);
 expect(rows.filter(r=>r.label==='nest')).toHaveLength(6);expect(rows.filter(r=>r.label==='junction')).toHaveLength(0);
 expect(rows).toHaveLength(72);
});
