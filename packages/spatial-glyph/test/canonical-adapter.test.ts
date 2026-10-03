import {describe,it,expect} from "vitest";
import {canonicalRef,spatialGlyph,UnverifiedCanonicalGlyphError} from "../src/canonical-adapter";
const pending={id:"water-01",sourceVersion:1,vectorAssetKey:"glyphs/water/water-01/vector/v1.svg",status:"source-raster-approved" as const,vectorStatus:"needs-review" as const};
const verified={...pending,status:"canonical-digital" as const,vectorStatus:"geometry-verified" as const};
describe("canonical spatial adapter",()=>{
 it("fails closed for unverified source geometry",()=>expect(()=>canonicalRef(pending)).toThrow(UnverifiedCanonicalGlyphError));
 it("creates a versioned immutable reference only after verification",()=>expect(canonicalRef(verified)).toEqual({glyphId:"water-01",version:"1",assetKey:"glyphs/water/water-01/vector/v1.svg"}));
 it("builds a validated spatial recipe without changing source identity",()=>expect(spatialGlyph(verified,{version:"1",depth:3,bevel:.2,curveSegments:12}).source.glyphId).toBe("water-01"));
 it("rejects invalid extrusion recipes",()=>expect(()=>spatialGlyph(verified,{version:"1",depth:0,bevel:0,curveSegments:8})).toThrow());
});
