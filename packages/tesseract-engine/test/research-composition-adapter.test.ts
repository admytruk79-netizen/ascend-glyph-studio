import {describe,it,expect} from "vitest";
import {researchRowToObservation,fitPriorFromAnalyzedRows,type AnalyzedResearchRow} from "../src/research-composition-adapter";
const row=(id:string):AnalyzedResearchRow=>({id,source:"museum",objectURL:"https://museum.example/objects/"+id,accession:id,institution:"Example Museum",stage:"analyzed",culturalAccess:"open",rights:{reviewed:true,compositionTrainingPermitted:true,license:"CC0"},features:{mirrorX:.4,repetitionX:.8,voidRatio:.5,scaleHierarchy:[1,2,3]},deconstruction:{bands:[{}]}});
describe("rights-gated research corpus adapter",()=>{
 it("rejects rows without explicit rights clearance",()=>{const x=row("1");delete x.rights;expect(researchRowToObservation(x)).toBeUndefined();});
 it("rejects restricted cultural access",()=>{const x=row("1");x.culturalAccess="review";expect(researchRowToObservation(x)).toBeUndefined();});
 it("converts accepted structural evidence into a composition prior",()=>{const r=fitPriorFromAnalyzedRows([row("1"),row("2"),row("3")]);expect(r.accepted).toBe(3);expect(r.prior?.repeatStrength).toBeCloseTo(.8);});
 it("does not train on one eligible record",()=>expect(fitPriorFromAnalyzedRows([row("1")]).prior).toBeUndefined());
});
