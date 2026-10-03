import {describe,it,expect} from "vitest";
import {manufacturerEligibility} from "../src/manufacturer-eligibility";
const p={manufacturerId:"factory-1",version:"1",status:"approved" as const,supportedGarmentStyleIds:["hero-shirt"],supportedMaterialIds:["linen-180"],supportedRecipeIds:["emb-1"],supportedSizes:["M"],maxThreadColors:6,maxEmbroideryWidthMm:250,maxEmbroideryHeightMm:200,sampleApproved:true,productionApproved:true};
describe("manufacturer eligibility",()=>{
 it("accepts a fully supported production state",()=>expect(manufacturerEligibility(p,{garmentStyleId:"hero-shirt",materialId:"linen-180",recipeIds:["emb-1"],size:"M",threadColors:3,embroideryWidthMm:200,embroideryHeightMm:150})).toEqual({eligible:true}));
 it("fails closed with explicit reasons",()=>expect(manufacturerEligibility({...p,productionApproved:false},{garmentStyleId:"hero-shirt",materialId:"linen-180",recipeIds:["emb-1"],size:"M",threadColors:9,embroideryWidthMm:300,embroideryHeightMm:150})).toEqual({eligible:false,reasons:["production-not-approved","thread-color-limit","embroidery-envelope-exceeded"]}));
});