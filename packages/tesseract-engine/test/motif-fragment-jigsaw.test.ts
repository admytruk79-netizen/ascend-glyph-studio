import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {assembleMotifFragmentJigsaw,type MotifFragmentLibrary} from '../src/motif-fragment-jigsaw';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
const library:MotifFragmentLibrary=JSON.parse(readFileSync('../../data/research/jigsaw-fragments-v1/library.json','utf8'));
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
it('assembles actual source fragments without changing their internal paths or canonical geometry',()=>{
 const before=JSON.stringify(library),canonical=structuredClone(ASCEND_PRIMITIVES),r=assembleMotifFragmentJigsaw(library,input);
 expect(r.placements).toHaveLength(r.columns*5);expect(r.checks).toEqual({overlappingPieceFootprints:0,outsideEnvelope:0});
 expect(r.placements.filter(p=>p.role==='border')).toHaveLength(r.columns*4);
 const placement=r.placements[0],f=library.fragments.find(f=>f.id===placement.fragmentId)!;
 const source=f.layers[0].graph.nodes.find(n=>n.geometry)!;
 const placed=r.graph.nodes.find(n=>n.id===`${placement.id}:colour-0:${source.id}`)!;
 expect(placed.geometry).toEqual(source.geometry);expect(placed.provenanceId).toContain(f.sourceId);
 expect(JSON.stringify(library)).toBe(before);expect(ASCEND_PRIMITIVES).toEqual(canonical);
 expect(r.svg).toContain('fill-rule="evenodd"');expect(r.svg).not.toMatch(/<image|data:image/);
 expect(r.historicalShapesReused).toBe(true);expect(r.learnedModelApplied).toBe(false);expect(r.stitchCount).toBeNull();expect(r.productionApproved).toBe(false);
},20000);
it('reproduces the same jigsaw and changes arrangements for another seed',()=>{
 const a=assembleMotifFragmentJigsaw(library,{...input,complexity:0}),b=assembleMotifFragmentJigsaw(library,{...input,complexity:0});
 expect(a.svg).toBe(b.svg);expect(a.placements).toEqual(b.placements);
 const other=assembleMotifFragmentJigsaw(library,{...input,complexity:0,seed:1});expect(other.placements).not.toEqual(a.placements);expect(other.svg).not.toBe(a.svg);
},20000);
it('rejects unverified permissions, out-of-frame fragments and missing compatible roles',()=>{
 const bad=structuredClone(library);bad.fragments[0].layers[0].graph.provenance[0].permission.status='unknown';expect(()=>assembleMotifFragmentJigsaw(bad,input)).toThrow('permission');
 expect(()=>assembleMotifFragmentJigsaw({...library,fragments:library.fragments.filter(f=>f.role!=='border')},input)).toThrow('missing-role:border');
 const escaped=structuredClone(library);escaped.fragments[0].layers[0].graph.nodes.find(n=>n.geometry)!.geometry!.paths[0][0].x=-1;expect(()=>assembleMotifFragmentJigsaw(escaped,input)).toThrow('fragment-envelope');
 expect(()=>assembleMotifFragmentJigsaw(library,{...input,widthMm:0})).toThrow('input');
});
