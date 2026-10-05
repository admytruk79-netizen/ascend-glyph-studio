import type{BillOfMaterials,MaterialSku,Supplier}from "../../../packages/erp-core/src/model";

export const suppliers:Supplier[]=[
 {id:"linen-mill-01",name:"ASCEND Linen Mill",active:true,capabilities:["linen","natural-fibers"],leadTimeDays:14},
 {id:"thread-house-01",name:"ASCEND Thread House",active:true,capabilities:["embroidery-thread"],leadTimeDays:7},
 {id:"bindery-01",name:"ASCEND Bindery Supply",active:true,capabilities:["bookbinding","covers"],leadTimeDays:10}
];

export const materials:MaterialSku[]=[
 {id:"linen-natural",name:"Natural linen",unit:"m",onHand:12,reserved:3.2,reorderPoint:10,leadTimeDays:14,supplierIds:["linen-mill-01"]},
 {id:"linen-midnight",name:"Midnight linen",unit:"m",onHand:4,reserved:1,reorderPoint:8,leadTimeDays:14,supplierIds:["linen-mill-01"]},
 {id:"linen-black",name:"Black linen",unit:"m",onHand:5,reserved:2,reorderPoint:8,leadTimeDays:14,supplierIds:["linen-mill-01"]},
 {id:"embroidery-thread",name:"Embroidery thread",unit:"spool",onHand:18,reserved:4,reorderPoint:10,leadTimeDays:7,supplierIds:["thread-house-01"]},
 {id:"diary-cover-stock",name:"Diary cover stock",unit:"piece",onHand:8,reserved:2,reorderPoint:12,leadTimeDays:10,supplierIds:["bindery-01"]},
 {id:"binding-pack",name:"Binding pack",unit:"pack",onHand:10,reserved:1,reorderPoint:8,leadTimeDays:10,supplierIds:["bindery-01"]}
];

const shirt=(size:string,fabricId:string):BillOfMaterials=>({
 id:`bom-shirt-${size}-${fabricId}`,productId:"shirt",size,revision:"1",
 lines:[
  {skuId:fabricId==="natural-linen"?"linen-natural":fabricId==="midnight-linen"?"linen-midnight":"linen-black",qty:size==="XL"||size==="XXL"?2.1:1.8,scrapRate:.08},
  {skuId:"embroidery-thread",qty:1,scrapRate:.08}
 ]
});
const diary=(fabricId:string):BillOfMaterials=>({
 id:`bom-diary-${fabricId}`,productId:"diary",size:"A5",revision:"1",
 lines:[{skuId:"diary-cover-stock",qty:1,scrapRate:.02},{skuId:"binding-pack",qty:1,scrapRate:.02},{skuId:"embroidery-thread",qty:.5,scrapRate:.08}]
});

export function bomFor(product:string,size:string,fabricId:string){return product==="diary"?diary(fabricId):shirt(size,fabricId)}
