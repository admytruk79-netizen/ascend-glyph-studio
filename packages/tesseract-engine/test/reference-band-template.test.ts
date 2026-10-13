import {it,expect} from 'vitest';
import {generateReferenceBand} from '../src/reference-band-template';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
it('builds framed canonical geometry deterministically within physical dimensions without promotion',()=>{
 const before=structuredClone(ASCEND_PRIMITIVES),input={widthMm:250,heightMm:60,complexity:.7,seed:'study-1',placement:'cuff' as const},r=generateReferenceBand(input);
 expect(r).toEqual(generateReferenceBand(input));expect(ASCEND_PRIMITIVES).toEqual(before);
 expect(r.productionObjects.length).toBe(r.columns*3);expect(r.stitchObjects.length).toBeGreaterThan(0);
 expect(r.manufacturingJob.validation.errors.some(e=>e.startsWith('outside-job-envelope'))).toBe(false);
 expect(r.manufacturingJob.validation.valid).toBe(false);expect(r.stitchCount).toBeNull();expect(r.provenance.learnedModelApplied).toBe(false);
 r.canonicalPaths[0].paths.push('caller mutation');expect(ASCEND_PRIMITIVES).toEqual(before);
 for(const o of r.productionObjects){expect(o.geometryRef).toBe(`ascend:${o.form}`);expect(o.physical.widthMm).toBe(o.physical.heightMm);}
});
it('bounds dimensions and capacity, rejects unsupported machines, and responds to edited controls',()=>{
 const i={widthMm:250,heightMm:60,complexity:.7,seed:'a',placement:'band' as const};
 expect(()=>generateReferenceBand({...i,widthMm:NaN})).toThrow('invalid-input');expect(()=>generateReferenceBand({...i,machineProfileId:'invented'})).toThrow('unknown-machine');
 expect(generateReferenceBand({...i,complexity:.1}).columns).toBeLessThan(generateReferenceBand(i).columns);
 expect(generateReferenceBand({...i,seed:'b'}).svg).not.toEqual(generateReferenceBand(i).svg);
});
