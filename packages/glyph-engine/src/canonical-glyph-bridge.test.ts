import {strict as assert} from "node:assert";
import {canonicalArtworkFromGlyph,CanonicalGlyphAssetUnavailableError} from "./canonical-glyph-bridge";
import {validateCanonicalArtwork} from "./canonical-artwork";

const verified={id:"water-02",sourceVersion:1,vectorAssetKey:"glyphs/water/water-02/vector/v1.svg",status:"canonical-digital" as const,vectorStatus:"geometry-verified" as const};
assert.throws(()=>canonicalArtworkFromGlyph(verified),CanonicalGlyphAssetUnavailableError);
assert.throws(()=>canonicalArtworkFromGlyph({...verified,id:"water-04",status:"source-raster-approved",vectorStatus:"needs-review"}),/has not passed canonical vector verification/);
assert.throws(()=>canonicalArtworkFromGlyph(verified,{assetKey:"wrong.svg",viewBox:{x:0,y:0,width:90,height:75},polygons:[[{x:0,y:0},{x:10,y:0},{x:5,y:10}]],minLineUnits:1,minGapUnits:1}),CanonicalGlyphAssetUnavailableError);

const asset={assetKey:verified.vectorAssetKey,viewBox:{x:0,y:0,width:90,height:75},polygons:[[{x:10,y:10},{x:80,y:10},{x:45,y:65}]],minLineUnits:2,minGapUnits:3};
const art=canonicalArtworkFromGlyph(verified,asset);
assert.equal(art.id,"water-02");
assert.equal(art.revision,"1");
assert.deepEqual(validateCanonicalArtwork(art),[]);
