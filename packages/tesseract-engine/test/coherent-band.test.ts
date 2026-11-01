import {describe,it,expect} from "vitest";
import {renderCoherentBand} from "../src/coherent-band";
import type {Topology} from "../src/topology";
const topology:Topology={nodes:[{id:"a",conceptId:"origin",form:"seed",scale:2},{id:"b",conceptId:"return",form:"orbit",scale:2},{id:"c",conceptId:"crossing",form:"crossing",scale:2}],edges:[]};
describe("coherent band rendering",()=>{
 it("is deterministic for identical seed and grammar",()=>{const a=renderCoherentBand(topology,{seed:13,grammar:"return"});expect(a.svg).toEqual(renderCoherentBand(topology,{seed:13,grammar:"return"}).svg);});
 it("creates a real void in passage grammar",()=>expect(renderCoherentBand(topology,{grammar:"passage"}).svg).toContain('data-role="interrupted-spine"'));
 it("uses source primitive paths, not topology edges",()=>{const r=renderCoherentBand(topology);expect(r.svg).toContain('data-renderer="coherent-band-v1"');expect(r.svg).not.toContain("data-relation=");});
 it("fails for empty geometry",()=>expect(()=>renderCoherentBand({nodes:[],edges:[]})).toThrow());
 it("rejects invalid sizes",()=>expect(()=>renderCoherentBand(topology,{width:-1})).toThrow());
});
