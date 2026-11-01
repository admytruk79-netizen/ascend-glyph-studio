import {describe,it,expect} from "vitest";
import {applyMotifGrammar,motifFamilyForConcept} from "../src/motif-grammar";
import {WESTERN_UKRAINIAN_SASH_GRAMMAR} from "../src/sash-evidence-grammar";
import type {Topology} from "../src/topology";

const base:Topology={
 nodes:[
  {id:"a",conceptId:"ancestry",form:"seed",scale:1},
  {id:"b",conceptId:"protection",form:"axis",scale:1},
  {id:"c",conceptId:"ascent",form:"axis",scale:1}
 ],
 edges:[
  {from:"a",to:"b",relation:"flow",weight:.9},
  {from:"b",to:"c",relation:"ascend",weight:.9}
 ]
};

describe("ASCEND motif grammar",()=>{
 it("selects ASCEND-native motif families by concept",()=>{
  expect(motifFamilyForConcept("ancestry").id).toBe("lineage-root");
  expect(motifFamilyForConcept("protection").id).toBe("protected-core");
  expect(motifFamilyForConcept("ascent").id).toBe("ascent-path");
 });
 it("expands semantic nodes into deterministic compound motifs",()=>{
  const a=applyMotifGrammar(base,"fixed-seed",{maxNodes:9,complexity:.9,sashGrammar:WESTERN_UKRAINIAN_SASH_GRAMMAR});
  const b=applyMotifGrammar(base,"fixed-seed",{maxNodes:9,complexity:.9,sashGrammar:WESTERN_UKRAINIAN_SASH_GRAMMAR});
  expect(a).toEqual(b);
  expect(a.topology.nodes.length).toBeGreaterThan(base.nodes.length);
  expect(a.topology.nodes.length).toBeLessThanOrEqual(9);
  expect(a.program.instances).toHaveLength(3);
  expect(a.program.evidence?.grammarId).toBe(WESTERN_UKRAINIAN_SASH_GRAMMAR.id);
 });
 it("preserves semantic concepts while changing geometry vocabulary",()=>{
  const x=applyMotifGrammar(base,"semantics",{maxNodes:9,complexity:.9});
  const concepts=new Set(x.topology.nodes.map(n=>n.conceptId));
  expect(concepts).toEqual(new Set(["ancestry","protection","ascent"]));
  expect(x.topology.nodes.some(n=>n.form==="branch")).toBe(true);
  expect(x.topology.nodes.some(n=>n.form==="orbit")).toBe(true);
 });
 it("uses motif operations as actual internal topology relations",()=>{
  const x=applyMotifGrammar(base,"ops",{maxNodes:9,complexity:.9,sashGrammar:WESTERN_UKRAINIAN_SASH_GRAMMAR});
  const allowed=new Set(["anchor","nest","orbit","intersect","bridge","oppose","mirror","radiate","flow","enclose","repeat","branch","transform","terminate","return","ascend"]);
  expect(x.topology.edges.every(e=>allowed.has(e.relation))).toBe(true);
  expect(x.topology.edges.some(e=>["nest","mirror","orbit","repeat","oppose","terminate","enclose","branch"].includes(e.relation))).toBe(true);
 });
});
