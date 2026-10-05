import type{BillOfMaterials,CustomerOrder,InventoryPosition,MaterialSku,PurchaseOrder,Supplier,SupplyPlan,WorkOrder}from"./model";
const round=(n:number)=>Math.round(n*1000)/1000;
export function explodeBom(bom:BillOfMaterials,qty:number){return bom.lines.map(l=>({skuId:l.skuId,qty:round(l.qty*qty*(1+l.scrapRate))}));}
export function availableStock(s:MaterialSku){return Math.max(0,round(s.onHand-s.reserved));}

export function planInventory(input:{order:CustomerOrder;bom:BillOfMaterials;materials:MaterialSku[];suppliers:Supplier[];now?:string}):{positions:InventoryPosition[];purchaseOrders:PurchaseOrder[]}{
 const {order,bom,materials,suppliers}=input,req=explodeBom(bom,order.qty),now=input.now??new Date().toISOString();
 const positions=req.map(r=>{const m=materials.find(x=>x.id===r.skuId);if(!m)throw new Error("missing material "+r.skuId);const available=availableStock(m),shortage=round(Math.max(0,r.qty-available));return{skuId:r.skuId,onHand:m.onHand,reserved:m.reserved,available,demand:r.qty,shortage};});
 const grouped=new Map<string,{skuId:string;qty:number}[]>();
 for(const p of positions.filter(x=>x.shortage>0)){
  const m=materials.find(x=>x.id===p.skuId)!;
  const sid=m.supplierIds.find(id=>suppliers.some(s=>s.id===id&&s.active));
  if(!sid)throw new Error("no active supplier for "+p.skuId);
  const xs=grouped.get(sid)??[];xs.push({skuId:p.skuId,qty:p.shortage});grouped.set(sid,xs);
 }
 const purchaseOrders:PurchaseOrder[]=[...grouped.entries()].map(([supplierId,lines],i)=>({id:`PO-${order.id}-${i+1}`,supplierId,status:"approved",currency:"USD",lines:lines.map(l=>({...l,unitCostMinor:0})),createdAt:now}));
 return{positions,purchaseOrders};
}

export function createWorkOrder(input:{order:CustomerOrder;bom:BillOfMaterials;manufacturerId:string;positions:InventoryPosition[]}):WorkOrder{
 const {order,bom,manufacturerId,positions}=input;
 return{id:`WO-${order.id}-1`,orderId:order.id,productId:order.productId,bomId:bom.id,qty:order.qty,status:positions.some(x=>x.shortage>0)?"planned":"released",manufacturerId,operations:["cutting","embroidery","sewing","finishing","qc"]};
}

export function planSupply(input:{order:CustomerOrder;bom:BillOfMaterials;materials:MaterialSku[];suppliers:Supplier[];manufacturerId:string;now?:string}):SupplyPlan{
 const inventory=planInventory(input);
 return{...inventory,workOrders:[createWorkOrder({order:input.order,bom:input.bom,manufacturerId:input.manufacturerId,positions:inventory.positions})]};
}
