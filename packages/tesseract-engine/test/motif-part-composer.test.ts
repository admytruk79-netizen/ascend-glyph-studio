import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeDetailedMotifParts,type MotifPartLibrary} from '../src/motif-part-composer';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
const library:MotifPartLibrary=JSON.parse(readFileSync('../../data/research/motif-parts-v1/library.json','utf8'));
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
it('assembles detailed source parts with real ports and protected flower space',()=>{
 const original=JSON.stringify(library),canonical=structuredClone(ASCEND_PRIMITIVES),r=composeDetailedMotifParts(library,input);
 expect(r.placements).toHaveLength(72);expect(r.structure.junctionCount).toBe(92);expect(r.structure.brokenJunctions).toBe(0);expect(r.checks).toEqual({leafFlowerOverlaps:[],outsideEnvelope:0});
 const first=r.placements[0]!,piece=library.pieces.find(p=>p.id===first.partId)!;
 expect(r.graph.nodes.find(n=>n.id===`${first.id}:layer-0`)!.geometry!.paths).toEqual(piece.layers[0]!.graph.nodes.flatMap(n=>n.geometry?.paths??[]));
 expect(JSON.stringify(library)).toBe(original);expect(ASCEND_PRIMITIVES).toEqual(canonical);expect(r.svg).not.toMatch(/<image|data:image/);expect(r.svg).toContain('fill-rule="evenodd"');expect(r.stitchCount).toBeNull();expect(r.productionApproved).toBe(false);
 expect(new Set(r.placements.filter(p=>p.id.startsWith('main-')||p.id.startsWith('bud-')).map(p=>p.partId)).size).toBe(9);
});
it('reproduces a seed and changes actual part selection with a different seed',()=>{
 const a=composeDetailedMotifParts(library,input),b=composeDetailedMotifParts(library,input),c=composeDetailedMotifParts(library,{...input,seed:1});expect(a.svg).toBe(b.svg);expect(a.placements).toEqual(b.placements);expect(a.svg).not.toBe(c.svg);
});
it('rejects unusable source permissions and fake attachment points',()=>{
 const denied=structuredClone(library);denied.pieces[0]!.layers[0]!.graph.provenance[0]!.permission.status='unknown';expect(()=>composeDetailedMotifParts(denied,input)).toThrow('permission');
 const moved=structuredClone(library);moved.pieces[0]!.ports.base.point={x:-10,y:-10};expect(()=>composeDetailedMotifParts(moved,input)).toThrow('port-off-path');
 const transformed=structuredClone(library);transformed.pieces[0]!.layers[0]!.graph.nodes[0]!.transform.xMm=1;expect(()=>composeDetailedMotifParts(transformed,input)).toThrow('source-transform');
 expect(()=>composeDetailedMotifParts({...library,pieces:library.pieces.filter(p=>p.kind!=='leaf')},input)).toThrow('missing-leaf');
 expect(()=>composeDetailedMotifParts(library,{...input,seed:-1})).toThrow('input');
});
