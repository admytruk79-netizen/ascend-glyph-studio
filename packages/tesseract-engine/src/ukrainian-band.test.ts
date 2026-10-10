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
   for(const row of b.grid){expect(row.slice(0,25)).toEqual(row.slice(0,25).reverse());expect(row[0]).toBe(row[24]);}
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
});
