import {describe,it,expect} from "vitest";
import {createProductionPackage} from "../src/production-package";
const manifest={schemaVersion:"1" as const,designId:"ASC-1",designVersion:1,lockedAt:"2026-10-02T00:00:00Z",glyphs:[{glyphId:"earth-01",canonicalVersion:"1"}],tesseract:{seed:"s",stateHash:"h"},garment:{styleId:"hero-shirt",revision:"1",size:"M",zoneIds:["cuff"]},material:{materialId:"linen-180",revision:"1",colorId:"natural"},manufacturing:{recipeIds:["emb-1"],capabilityProfileVersion:"1"},pricing:{currency:"USD",customerTotalMinor:10000}};
const roles=["tech-pack","placement-preview","canonical-svg","bom","thread-spec","machine-manifest"] as const;
const files=roles.map((role,i)=>({role,key:`f${i}`,sha256:"a".repeat(64)}));
describe("production package",()=>{
 it("locks a complete hashed package",()=>expect(createProductionPackage({manifest,files,createdAt:"2026-10-02T01:00:00Z"}).packageId).toBe("ASC-1:v1"));
 it("rejects incomplete factory packages",()=>expect(()=>createProductionPackage({manifest,files:files.slice(1),createdAt:"2026-10-02T01:00:00Z"})).toThrow("missing production file"));
});