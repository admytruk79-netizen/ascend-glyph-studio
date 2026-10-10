import {describe,it,expect} from "vitest";
import {composeAuthorOrnament,AUTHOR_FAMILIES,type AuthorRecipe} from "./author-ornament";
const recipe:AuthorRecipe={version:"ascend-author-ornament/1",family:"seed-current",layout:"band",colorway:"blue-ember",widthMm:240,heightMm:60,repeat:6,detail:2,variation:0};
describe("author composition",()=>{
  it("reproduces exact artwork from a saved recipe without mutating it",()=>{
    const input=Object.freeze({...recipe});const a=composeAuthorOrnament(input);
    expect(composeAuthorOrnament(JSON.parse(JSON.stringify(a.recipe)))).toEqual(a);
    expect(a.status).toBe("prototype");expect(a.svg).toContain('width="240mm" height="60mm"');
    expect(a.svg.match(/data-role="motif"/g)).toHaveLength(6);
    expect(a.svg.match(/data-role="separator"/g)).toHaveLength(1);
  });
  it("keeps family sources distinct and the artwork responsive to controls",()=>{
    const results=AUTHOR_FAMILIES.map(f=>composeAuthorOrnament({...recipe,family:f.id}));
    expect(new Set(results.map(x=>x.svg)).size).toBe(3);
    expect(results.every(x=>x.sources.every(p=>p.startsWith("originals/drawings/")))).toBe(true);
    expect(composeAuthorOrnament({...recipe,colorway:"ink"}).svg).not.toEqual(results[0].svg);
    expect(composeAuthorOrnament({...recipe,variation:1}).svg).not.toEqual(results[0].svg);
    expect(composeAuthorOrnament({...recipe,layout:"emblem"}).svg.match(/data-role="motif"/g)).toHaveLength(1);
  });
  it("bounds separator vertical control points on a wide, shallow band",()=>{
    const result=composeAuthorOrnament({...recipe,widthMm:400,heightMm:30,repeat:3});
    const separator=result.svg.split('data-role="separator"')[1];
    for(const d of separator.matchAll(/d="([^"]+)"/g)){
      const nums=d[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      for(let i=1;i<nums.length;i+=2){expect(nums[i]).toBeGreaterThan(0);expect(nums[i]).toBeLessThan(30);}
    }
  });
  it("rejects invalid persisted controls rather than emitting unsafe SVG",()=>{
    for(const patch of [{widthMm:NaN},{repeat:2},{layout:"panel",repeat:8},{family:'<script>'},{colorway:"constructor"}]){
      expect(()=>composeAuthorOrnament({...recipe,...patch} as AuthorRecipe)).toThrow();
    }
  });
});
