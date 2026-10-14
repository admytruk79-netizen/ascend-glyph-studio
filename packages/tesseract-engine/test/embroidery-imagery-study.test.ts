import {it,expect} from 'vitest';
import {embroideryImageryStudy} from '../src/embroidery-imagery-study';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
it('renders dense ornamental cells and layered borders without modifying canonical geometry or claiming stitches',()=>{
 const before=structuredClone(ASCEND_PRIMITIVES),i={widthMm:250,heightMm:80,complexity:.8,family:'geometric' as const,seed:0},r=embroideryImageryStudy(i);
 expect(r).toEqual(embroideryImageryStudy(i));expect(r.svg).toContain('width="250mm"');expect(r.svg.match(/<use /g)!.length).toBeGreaterThan(60);
 expect(r.geometryNamespace).toBe('ornament-study');expect(r.stitchCount).toBeNull();expect(r.productionApproved).toBe(false);expect(ASCEND_PRIMITIVES).toEqual(before);
 expect(embroideryImageryStudy({...i,family:'floral'}).svg).not.toBe(r.svg);
 expect(()=>embroideryImageryStudy({...i,widthMm:NaN})).toThrow('invalid-input');
});
