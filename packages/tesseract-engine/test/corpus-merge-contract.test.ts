import{describe,it,expect}from"vitest";
describe("corpus merge contract",()=>{it("requires id-based dedupe semantics",()=>{const xs=[{id:"a",v:1},{id:"a",v:2},{id:"b",v:3}];const out=[...new Map(xs.map(x=>[x.id,x])).values()];expect(out).toHaveLength(2);expect(out.find(x=>x.id==="a")?.v).toBe(2)})});
