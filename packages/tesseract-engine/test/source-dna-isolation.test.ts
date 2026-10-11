import {describe,it,expect} from "vitest";
import {ASCEND_PRIMITIVES,primitiveForForm,corpusPrimitiveForForm,installCorpusCanon} from "../src/ascend-primitives";
import type {CorpusCanonicalGeometry} from "../src/corpus-canonical";
import {observationVector} from "../src/visual-features";
import {genomeFromTopology} from "../src/genome";
import {projectSemanticGeometry} from "../src/semantic-projector";
import {compileProductionObjectsToStitchIr} from "../src/production-stitch-ir";
import {productionObjectsFromTopology} from "../src/production-object";
import {deriveConstructionEnvelope} from "../src/construction-envelope";

const corpus:CorpusCanonicalGeometry={
 id:"research-only",version:"corpus-canonical/0.1",viewBox:"0 0 100 100",
 paths:["M1 2 L97 98"],centroid:observationVector({features:{}} as Parameters<typeof observationVector>[0]),
 support:100,traditions:["research-tradition"],sources:["research-source"],
 nearestReferenceDistance:.8,status:"canonical",provenance:{observationIds:["research-observation"]}
};

describe("ASCEND source DNA isolation",()=>{
 it("keeps corpus geometry out of the ASCEND vocabulary and preserves aliases",()=>{
  try{
   installCorpusCanon([corpus]);
   expect(corpusPrimitiveForForm("seed")!.paths).toEqual(corpus.paths);
   for(const [id,primitive] of Object.entries(ASCEND_PRIMITIVES))expect(primitiveForForm(id)).toEqual(primitive);
   expect(primitiveForForm("bifurcation")).toEqual(ASCEND_PRIMITIVES.branch);
   expect(primitiveForForm("enclosure")).toEqual(ASCEND_PRIMITIVES.torus);
   expect(primitiveForForm("mutation")).toEqual(ASCEND_PRIMITIVES["spatial-flow"]);
   expect(primitiveForForm("unknown")).toBe(undefined);
  }finally{installCorpusCanon([])}
 });
 it("preserves preview and stitch geometry when research corpus geometry is installed",()=>{
  const topology={nodes:[{id:"a",conceptId:"origin",form:"seed",scale:1}],edges:[]};
  const genome=genomeFromTopology("source-dna",topology);
  const objects=productionObjectsFromTopology(topology,deriveConstructionEnvelope(undefined,"embroidery"));
  installCorpusCanon([]);
  const preview=projectSemanticGeometry(genome,200,100).svg;
  const stitches=compileProductionObjectsToStitchIr(objects);
  try{
   installCorpusCanon([corpus]);
   expect(projectSemanticGeometry(genome,200,100).svg).toBe(preview);
   expect(compileProductionObjectsToStitchIr(objects)).toEqual(stitches);
   expect(preview).not.toContain(corpus.paths[0]!);
  }finally{installCorpusCanon([])}
 });
});
