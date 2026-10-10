import {describe,it,expect} from 'vitest';
import {BOTANICAL_KINDS,generateUkrainianBotanical} from './ukrainian-botanical';
import {generatePatterns} from './pattern-generator';
describe('independently drawn Ukrainian botanical composition',()=>{
 it('keeps every geometry inside the panel and preserves IR/SVG object identity',()=>{
  for(const kind of BOTANICAL_KINDS)for(const tiers of [3,4,5] as const){
   const d=generateUkrainianBotanical({seed:'bounds',kind,tiers});
   expect(new Set(d.objects.map(o=>o.id)).size).toBe(d.objects.length);
   expect(d.svg.match(/data-object=/g)).toHaveLength(d.objects.length);
   let valid=true;
   for(const o of d.objects){const points=o.kind==='fill'?o.polygon:o.path;const margin=o.kind==='satin'?o.width/2:0;
    for(const p of points)valid=valid&&p.x-margin>=0&&p.x+margin<=d.widthMm&&p.y-margin>=0&&p.y+margin<=d.heightMm;
   }
   expect(valid).toBe(true);
  }
 });
 it('changes branching geometry and petal construction with seed, not only colours',()=>{
  const samples=Array.from({length:12},(_,n)=>generateUkrainianBotanical({seed:'variation:'+n,kind:'flowering-tree'}));
  const geometry=samples.map(d=>JSON.stringify(d.objects.map(o=>o.kind==='fill'?o.polygon:o.path)));
  expect(new Set(geometry).size).toBeGreaterThan(2);
  expect(generateUkrainianBotanical({seed:'variation:0',kind:'flowering-tree'})).toEqual(samples[0]);
 });
 it('produces all three families through the real engine with source links and no authenticity score',()=>{
  const p=generatePatterns({seed:'botanical',concepts:[],compositionStyle:'ukrainian-botanical',mode:'field',variations:3});
  expect(p.map(d=>d.sourceEvidence?.kind)).toEqual([...BOTANICAL_KINDS]);
  for(const d of p){expect(d.sourceEvidence?.sourceIds).toContain('kro-613');expect(d.objectives.physicalConfidence).toBe(0);expect(d.svg).not.toContain('<image');}
  expect(p[2]!.stitchObjects!.some(o=>o.id.startsWith('bird:'))).toBe(true);
  expect(p[0]!.stitchObjects!.some(o=>o.id.startsWith('bird:'))).toBe(false);
 });
 it('rejects invalid dimensions, unsupported palettes, tiers and placement',()=>{
  for(const patch of [{widthMm:NaN},{heightMm:0},{tiers:7},{palette:'fake'}])expect(()=>generateUkrainianBotanical({seed:'x',kind:'flowering-tree',...patch} as never)).toThrow();
  expect(()=>generatePatterns({seed:'x',concepts:[],compositionStyle:'ukrainian-botanical',mode:'cuff'})).toThrow();
 });
});
