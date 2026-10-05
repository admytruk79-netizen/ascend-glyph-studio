import{describe,it,expect}from"vitest";import{explodeBom,planSupply}from"../src/planning";
describe("ERP supply planning",()=>{
 const bom={id:"bom-shirt-m",productId:"shirt",size:"M",revision:"1",lines:[{skuId:"linen",qty:1.8,scrapRate:.08},{skuId:"thread",qty:1,scrapRate:.05}]};
 it("explodes BOM with scrap",()=>{expect(explodeBom(bom,2)).toEqual([{skuId:"linen",qty:3.888},{skuId:"thread",qty:2.1}])});
 it("creates shortages, POs and blocks release until supply exists",()=>{
  const p=planSupply({order:{id:"1001",designId:"d1",productId:"shirt",size:"M",qty:2,paid:true,shippingCountry:"US",createdAt:"2026-10-05"},bom,materials:[{id:"linen",name:"linen",unit:"m",onHand:1,reserved:0,reorderPoint:2,leadTimeDays:14,supplierIds:["s1"]},{id:"thread",name:"thread",unit:"spool",onHand:5,reserved:0,reorderPoint:2,leadTimeDays:7,supplierIds:["s1"]}],suppliers:[{id:"s1",name:"Mill",active:true,capabilities:["linen"],leadTimeDays:14}],manufacturerId:"m1",now:"2026-10-05"});
  expect(p.positions.find(x=>x.skuId==="linen")?.shortage).toBe(2.888);expect(p.purchaseOrders).toHaveLength(1);expect(p.workOrders[0]?.status).toBe("planned");
 });
});
