import {describe,it,expect} from "vitest";
import {advance} from "../src/order-workflow";
describe("order-to-delivery workflow",()=>{
 it("permits guarded forward progress",()=>expect(advance("payment-captured","package-generated")).toBe("package-generated"));
 it("cannot manufacture before factory acceptance",()=>expect(()=>advance("package-generated","in-production")).toThrow());
 it("cannot ship before QC",()=>expect(()=>advance("in-production","shipped")).toThrow());
 it("cannot mutate delivered work",()=>expect(()=>advance("delivered","shipped")).toThrow());
});
