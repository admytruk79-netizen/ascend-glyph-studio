import {describe,it,expect} from "vitest";
import {generateAndCritiqueVisuals} from "./visual-pipeline";
import type {VisualGeneratorProvider,VisualGenerationRequest} from "./visual-generator";
const vec:Record<string,number[]>={source:[1,0],copy:[.99,.01],novel:[0,1]};
const provider:VisualGeneratorProvider={
 id:"test",
 async generate(r){return ["copy","novel"].map(id=>({id,seed:r.seed,imageUri:id,width:r.width,height:r.height,provenance:{model:"test",traditions:r.traditions,ascendGlyphIds:r.ascendGlyphIds}}))},
 async embed(uri){return vec[uri]??[0,0]},
 async segment(uri){return {maskUri:uri+".mask",labels:["ornament"]}},
 async estimateDepth(uri){return {depthUri:uri+".depth"}}
};
const request:VisualGenerationRequest={seed:"s",width:1024,height:1024,physicalWidthMm:300,physicalHeightMm:300,ascendGlyphIds:["earth-01"],traditions:[{id:"ukrainian",weight:.4},{id:"arabic-islamic",weight:.3},{id:"indigenous-north-america",weight:.3,community:"Dine"}],medium:"embroidery",complexity:.9,repeat:"tessellated"};
describe("visual pipeline",()=>{it("rejects near-copy and decomposes novel candidate",async()=>{const r=await generateAndCritiqueVisuals(provider,request,[{id:"src",imageUri:"source",rightsApproved:true,traditionId:"ukrainian"}],.86);expect(r.rejected.map(x=>x.candidateId)).toEqual(["copy"]);expect(r.accepted).toHaveLength(1);expect(r.accepted[0]!.candidate.id).toBe("novel");expect(r.accepted[0]!.segmentation.maskUri).toBe("novel.mask")})});
