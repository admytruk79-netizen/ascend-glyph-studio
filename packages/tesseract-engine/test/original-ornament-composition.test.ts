import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {generateOriginalOrnament,ORIGINAL_GRAMMAR_SOURCE} from '../src/original-ornament-composition';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
it('assembles original parts with intact contacts, containment, fields and no embedded photographs',()=>{
 const before=structuredClone(ASCEND_PRIMITIVES),r=generateOriginalOrnament(input);
 expect(r.structure.junctionCount).toBe(r.columns*6);expect(r.structure.brokenJunctions).toBe(0);expect(r.structure.brokenRepeats).toBe(0);
 expect(r.structure.nestedRelations).toBeGreaterThan(0);expect(r.clearance.clearanceViolations).toEqual([]);expect(r.clearance.outsideEnvelope).toEqual([]);
 expect(r.svg).not.toMatch(/<image|data:image|<use /);expect(r.sourceImagesEmbedded).toBe(false);
 expect(r.productionApproved).toBe(false);expect(r.stitchCount).toBeNull();expect(r.learnedModelApplied).toBe(false);expect(ASCEND_PRIMITIVES).toEqual(before);
 expect(r.graph.provenance[0].originalSha256).toBe(createHash('sha256').update(ORIGINAL_GRAMMAR_SOURCE).digest('hex'));
});
it('reproduces a seed and changes actual motif geometry for a different seed',()=>{
 const a=generateOriginalOrnament(input),b=generateOriginalOrnament({...input,seed:1});
 expect(generateOriginalOrnament(input)).toEqual(a);
 const paths=(g:typeof a.graph)=>g.nodes.filter(n=>n.geometry).map(n=>n.geometry!.paths);
 expect(paths(b.graph)).not.toEqual(paths(a.graph));expect(b.svg).not.toBe(a.svg);
 const geometric=generateOriginalOrnament({...input,family:'geometric',complexity:.3});expect(geometric.structure.junctionCount).toBe(0);expect(geometric.clearance.clearanceViolations).toEqual([]);
 expect(()=>generateOriginalOrnament({...input,seed:-1})).toThrow('invalid-input');
});
