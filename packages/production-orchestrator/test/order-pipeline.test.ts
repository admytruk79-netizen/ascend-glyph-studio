import{describe,it,expect}from"vitest";
import{createOperationalPlan,advanceOperationalStage}from"../src/order-pipeline";
import{verifyLedger,createProvenancePassport}from"../src/event-ledger";

const manifest={
 schemaVersion:"1" as const,designId:"design-1",designVersion:1,lockedAt:"2026-10-05T00:00:00Z",
 glyphs:[{glyphId:"axis",canonicalVersion:"1"}],tesseract:{seed:"s",stateHash:"abc"},
 garment:{styleId:"shirt-01",revision:"1",size:"M",zoneIds:["cuff"]},
 material:{materialId:"linen-natural",revision:"1",colorId:"natural"},
 manufacturing:{recipeIds:["embroidery-01"],capabilityProfileVersion:"1"},
 pricing:{currency:"USD",customerTotalMinor:12000}
};
const order={id:"ord-1",designId:"design-1",productId:"shirt",size:"M",qty:1,paid:true,shippingCountry:"US",createdAt:"2026-10-05"};
const bom={id:"bom-1",productId:"shirt",size:"M",revision:"1",lines:[{skuId:"linen-natural",qty:1.8,scrapRate:.08},{skuId:"thread",qty:1,scrapRate:.05}]};
const materials=[
 {id:"linen-natural",name:"linen",unit:"m" as const,onHand:1,reserved:0,reorderPoint:2,leadTimeDays:14,supplierIds:["sup-1"]},
 {id:"thread",name:"thread",unit:"spool" as const,onHand:4,reserved:0,reorderPoint:1,leadTimeDays:7,supplierIds:["sup-1"]}
];
const suppliers=[{id:"sup-1",name:"Supplier",active:true,capabilities:["linen","thread"],leadTimeDays:14}];
const manufacturers=[{manufacturerId:"mfg-1",version:"1",status:"approved" as const,supportedGarmentStyleIds:["shirt-01"],supportedMaterialIds:["linen-natural"],supportedRecipeIds:["embroidery-01"],supportedSizes:["M"],maxThreadColors:8,maxEmbroideryWidthMm:300,maxEmbroideryHeightMm:300,sampleApproved:true,productionApproved:true}];
const requirements={garmentStyleId:"shirt-01",materialId:"linen-natural",recipeIds:["embroidery-01"],size:"M",threadColors:3,embroideryWidthMm:120,embroideryHeightMm:80};

describe("ordered operational pipeline",()=>{
 it("builds in the required order and creates PO only for shortages",()=>{
  const p=createOperationalPlan({order,manifest,bom,materials,suppliers,manufacturers,requirements,now:"2026-10-05T00:00:00Z"});
  expect(p.events.map(e=>e.stage)).toEqual([
   "storefront-configured","order-created","production-manifest-locked","inventory-checked","manufacturer-eligible","purchase-order-created","work-order-created"
  ]);
  expect(p.purchaseOrders).toHaveLength(1);
  expect(p.workOrder.status).toBe("planned");
  expect(verifyLedger(p.ledger)).toEqual({valid:true});
  expect(createProvenancePassport(p.ledger).eventCount).toBe(p.events.length);
 });
 it("continues only production -> QC -> shipping -> delivery",()=>{
  const p=createOperationalPlan({order,manifest,bom:{...bom,lines:[{skuId:"thread",qty:1,scrapRate:0}]},materials,suppliers,manufacturers,requirements,now:"2026-10-05T00:00:00Z"});
  let e=p.events;
  e=advanceOperationalStage(e,"in-production","2026-10-06");
  e=advanceOperationalStage(e,"qc-passed","2026-10-07");
  e=advanceOperationalStage(e,"shipped","2026-10-08");
  e=advanceOperationalStage(e,"delivered","2026-10-10");
  expect(e.at(-1)?.stage).toBe("delivered");
  expect(()=>advanceOperationalStage(e,"shipped","2026-10-11")).toThrow();
 });
 it("fails closed when manufacturer is not eligible",()=>{
  expect(()=>createOperationalPlan({order,manifest,bom,materials,suppliers,manufacturers:[{...manufacturers[0]!,productionApproved:false}],requirements})).toThrow("no eligible manufacturer");
 });
});
