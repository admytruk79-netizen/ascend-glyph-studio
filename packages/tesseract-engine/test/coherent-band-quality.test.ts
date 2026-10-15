import {describe,it,expect} from "vitest";
import {generateAndAssessCoherentBand,assessCoherentBand} from "../src/coherent-band-quality";
import {renderCoherentBand} from "../src/coherent-band";
import type {Topology} from "../src/topology";
const topology:Topology={nodes:[
 {id:"a",conceptId:"origin",form:"seed",scale:2},
 {id:"b",conceptId:"return",form:"orbit",scale:2},
 {id:"c",conceptId:"crossing",form:"crossing",scale:2}
],edges:[]};
describe("coherent band structural quality",()=>{
 it("reports source geometry as provisional",()=>{const x=generateAndAssessCoherentBand(topology);expect(x.assessment.reasons).toContain("source-geometry-not-verified");});
 it("accepts grammatically intact preview, without production certification",()=>{const x=generateAndAssessCoherentBand(topology,{grammar:"passage"});expect(x.assessment.metrics.grammarIntegrity).toBe(true);expect(x.assessment.accepted).toBe(true);});
 it("rejects corrupted passage structure",()=>{const x=renderCoherentBand(topology,{grammar:"passage"});const corrupt={...x,svg:x.svg.replace('data-role="interrupted-spine"',"")};expect(assessCoherentBand(topology,corrupt,"passage").accepted).toBe(false);});
 it("flags insufficient source variation",()=>{const onlyOne:Topology={nodes:[topology.nodes[0]!],edges:[]};expect(generateAndAssessCoherentBand(onlyOne).assessment.reasons).toContain("motif-diversity-low");});
});
