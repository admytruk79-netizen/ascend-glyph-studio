import {describe,it,expect} from 'vitest';
import {penroseSun,GOLDEN_RATIO,type RobinsonTriangle} from './penrose';
import {generateUkrainianSymbiosis,SYMBIOSIS_KINDS} from './ukrainian-symbiosis';
import {generatePatterns} from './pattern-generator';
const area=(t:RobinsonTriangle)=>Math.abs((t.b.x-t.a.x)*(t.c.y-t.a.y)-(t.b.y-t.a.y)*(t.c.x-t.a.x))/2;
describe('Penrose substitution and contemporary symbiosis',()=>{
 it('conserves patch area through golden-ratio refinement and preserves the two triangle shapes',()=>{
  const initial=penroseSun(0).reduce((n,t)=>n+area(t),0);
  for(let depth=0;depth<=5;depth++){
   const tiles=penroseSun(depth);expect(tiles.reduce((n,t)=>n+area(t),0)).toBeCloseTo(initial,10);
   for(const t of tiles){const lengths=[Math.hypot(t.a.x-t.b.x,t.a.y-t.b.y),Math.hypot(t.b.x-t.c.x,t.b.y-t.c.y),Math.hypot(t.c.x-t.a.x,t.c.y-t.a.y)].sort((a,b)=>a-b);expect(lengths[2]!/lengths[0]!).toBeCloseTo(GOLDEN_RATIO,8);expect(area(t)).toBeGreaterThan(0);}
  }
  expect(penroseSun(4)).toHaveLength(340);
 });
 it('does not overlap triangle interiors in the refined patch',()=>{
  const tiles=penroseSun(3);
  for(const t of tiles){const p={x:(t.a.x+t.b.x+t.c.x)/3,y:(t.a.y+t.b.y+t.c.y)/3};
   const contains=(q:RobinsonTriangle)=>{const parts=area({...q,a:p})+area({...q,b:p})+area({...q,c:p});return Math.abs(parts-area(q))<1e-9;};
   expect(tiles.filter(contains)).toHaveLength(1);
  }
 });
 it('keeps the shared geometry in bounds and identifies each source tradition and medium',()=>{
  for(const kind of SYMBIOSIS_KINDS){const d=generateUkrainianSymbiosis({seed:'fusion',kind});
   expect(d.svg.match(/data-object=/g)).toHaveLength(d.objects.length);
   expect(new Set(d.objects.map(o=>o.id)).size).toBe(d.objects.length);
   expect(d.metadata.sourceIds).toContain('kro-613');expect(d.metadata.sourceIds).toContain('met-448652');expect(d.metadata.penrose.finitePatch).toBe(true);
   expect(d.metadata.references.find(r=>r.id==='met-451101')!.observation).toContain('not Arabic');
   let bounded=true;for(const o of d.objects)for(const p of o.kind==='fill'?o.polygon:o.path)bounded=bounded&&p.x>=0&&p.x<=d.widthMm&&p.y>=0&&p.y<=d.heightMm;expect(bounded).toBe(true);
  }
 });
 it('routes the real engine through both families and rejects invalid refinement',()=>{
  const designs=generatePatterns({seed:'fusion',concepts:[],mode:'field',compositionStyle:'ukrainian-symbiosis',variations:4});expect(designs.map(d=>d.sourceEvidence?.kind)).toEqual([...SYMBIOSIS_KINDS]);
  expect(designs[1]!.stitchObjects!.some(o=>o.id.startsWith('ibex:'))).toBe(true);
  expect(()=>penroseSun(7)).toThrow();expect(()=>generateUkrainianSymbiosis({seed:'x',kind:'penrose-garden',depth:2 as never})).toThrow();
 });
 it('constructs outlined flowers, veined leaves and alternating ribbon bridges in the detailed families',()=>{
  const d=generateUkrainianSymbiosis({seed:'illumination',kind:'illuminated-garden'});
  expect(d.metadata.penrose.depth).toBe(5);
  expect(d.metadata.interlace?.alternatingOverpasses).toBe(true);
  expect(d.objects.some(o=>o.id.includes(':petal:2:'))).toBe(true);
  expect(d.objects.some(o=>o.id.includes('braid:overpass:'))).toBe(true);
  expect(d.objects.some(o=>o.id.includes(':vein:'))).toBe(true);
  const lower=generateUkrainianSymbiosis({seed:'illumination',kind:'penrose-garden'});
  expect(d.objects.map(o=>o.id)).not.toEqual(lower.objects.map(o=>o.id));
 });

 it('keeps foliage clear of flower heads across branch tiers and palettes',()=>{
  for(const tiers of [3,4,5] as const)for(const palette of ['red-cream','garden-dark'] as const){
   const d=generateUkrainianSymbiosis({seed:'clearance',kind:'illuminated-garden',tiers,palette});
   const norm=(p:{x:number;y:number})=>({x:p.x/d.widthMm*100,y:p.y/d.heightMm*140});
   const heads=d.objects.filter(o=>o.kind==='fill'&&o.id.endsWith(':calyx')).map(o=>{if(o.kind!=='fill')throw Error();const p=o.polygon.map(norm),xs=p.map(p=>p.x),ys=p.map(p=>p.y);return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,r:Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/2};});
   const leaves=d.objects.filter(o=>o.kind==='fill'&&o.id.includes('leaf'));
   expect(leaves.length).toBeGreaterThan(0);
   for(const leaf of leaves){if(leaf.kind!=='fill')throw Error();for(const p of leaf.polygon.map(norm))for(const head of heads)expect(Math.hypot(p.x-head.x,p.y-head.y)).toBeGreaterThan(head.r);}
  }
 });

});
