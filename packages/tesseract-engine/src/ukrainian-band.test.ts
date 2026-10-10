import {describe,it,expect} from "vitest";
import {generateUkrainianBand,UKRAINIAN_BAND_KINDS} from "./ukrainian-band";
import {generatePatterns} from "./pattern-generator";
describe("reviewed Ukrainian counted band",()=>{
 it("conditions the real engine on recorded Neon evidence and shares export geometry",()=>{
  const p=generatePatterns({seed:"source-test",concepts:[],compositionStyle:"ukrainian-counted-band",mode:"band",medium:"embroidery",variations:1})[0]!;
  expect(p.sourceEvidence?.sourceIds).toEqual(["commons-23697961"]);
  expect(p.sourceEvidence?.inkCoverage).toBeGreaterThan(.45);
  expect(p.svg.match(/<polygon /g)).toHaveLength(p.stitchObjects!.length);
  expect(p.svg).not.toContain("data-compound-grammar");
  expect(p.objectives.physicalConfidence).toBe(0);
 });
 it("preserves reflection and exact repeat boundaries in every family",()=>{
  for(const kind of UKRAINIAN_BAND_KINDS){
   const b=generateUkrainianBand({seed:"mirror",kind,widthMm:250,heightMm:60,repeats:6});
   for(const row of b.grid){expect(row.slice(0,b.metadata.repeatUnitCells)).toEqual(row.slice(0,b.metadata.repeatUnitCells).reverse());expect(row[0]).toBe(row[b.metadata.repeatUnitCells-1]);}
   for(const o of b.objects){expect(o.kind).toBe("fill");if(o.kind==="fill")for(const p of o.polygon){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(250.00001);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(60.00001);}}
   expect(generateUkrainianBand({seed:"mirror",kind,widthMm:250,heightMm:60,repeats:6})).toEqual(b);
  }
 });
 it("rejects impossible dimensions, invalid controls and unsupported placements",()=>{
  for(const patch of [{widthMm:NaN},{heightMm:0},{repeats:2},{repeats:3.5}])expect(()=>generateUkrainianBand({seed:"x",kind:"stepped-cross",widthMm:250,heightMm:60,...patch})).toThrow();
  expect(()=>generatePatterns({seed:"x",concepts:[],compositionStyle:"ukrainian-counted-band",mode:"field"})).toThrow();
 });
 it("builds three and five symmetric bands with subordinate paired flanks",()=>{
  for(const bands of [3,5] as const){
   const b=generateUkrainianBand({seed:"paper",kind:"linked-diamonds",bands,widthMm:250,heightMm:60});
   expect(b.metadata.bandCount).toBe(bands);
   expect(b.metadata.paperSources[0]!.doi).toBe("10.15407/nz2022.05.1147");
   expect(b.metadata.bands.filter(p=>p.primary)).toHaveLength(1);
   for(let y=0;y<b.grid.length;y++)expect(b.grid[y]).toEqual(b.grid[b.grid.length-1-y]);
   const primary=b.metadata.bands.find(p=>p.primary)!;
   expect(b.metadata.bands.filter(p=>!p.primary).every(p=>p.height<primary.height)).toBe(true);
   for(const o of b.objects)if(o.kind==="fill")for(const p of o.polygon){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(250.00001);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(60.00001);}
  }
 });
 it("fills the selected extent with ornament instead of shrinking or leaving empty gutters",()=>{
  for(const kind of UKRAINIAN_BAND_KINDS)for(const bands of [1,3,5] as const)for(const repeats of [3,11,24]){
   const b=generateUkrainianBand({seed:"density",kind,bands,repeats,widthMm:250,heightMm:60});
   expect(b.grid.flat().every(c=>c>=0)).toBe(true);
   expect(b.metadata.ornamentCoverage).toBeGreaterThan(.5);
   const points=b.objects.flatMap(o=>o.kind==="fill"?o.polygon:[]);
   expect(points.reduce((n,p)=>Math.min(n,p.x),Infinity)).toBe(0);
   expect(points.reduce((n,p)=>Math.max(n,p.x),-Infinity)).toBeCloseTo(250);
   expect(points.reduce((n,p)=>Math.min(n,p.y),Infinity)).toBe(0);
   expect(points.reduce((n,p)=>Math.max(n,p.y),-Infinity)).toBeCloseTo(60);
  }
 });

 it("offers structurally distinct medallions and joined networks through the actual engine",()=>{
  const options={seed:"complex",widthMm:250,heightMm:60,bands:3 as const};
  const medallion=generateUkrainianBand({...options,kind:"hooked-medallions"});
  const network=generateUkrainianBand({...options,kind:"joined-diamond-network"});
  expect(medallion.metadata.repeatUnitCells).toBe(49);
  expect(medallion.grid).not.toEqual(network.grid);
  const alternatives=Array.from({length:12},(_,n)=>generateUkrainianBand({...options,kind:"hooked-medallions",seed:`variant:${n}`}).grid);
  expect(new Set(alternatives.map(g=>JSON.stringify(g))).size).toBeGreaterThan(2);
  const generated=generatePatterns({seed:"complex",concepts:[],compositionStyle:"ukrainian-counted-band",mode:"band",variations:5});
  expect(new Set(generated.map(p=>p.sourceEvidence?.kind)).size).toBe(5);
 });

});
