import {createWorkOrder,planInventory,type BillOfMaterials,type CustomerOrder,type MaterialSku,type Supplier,type WorkOrder,type PurchaseOrder,type InventoryPosition} from "@ascend/erp-core";
import {assertLockedManifest,type ProductionDesignManifest} from "./production-manifest";
import {manufacturerEligibility,type ManufacturerCapabilityProfile,type ProductionRequirements} from "./manufacturer-eligibility";

export type OrderPipelineStage=
 "storefront-configured"|
 "order-created"|
 "production-manifest-locked"|
 "inventory-checked"|
 "manufacturer-eligible"|
 "purchase-order-created"|
 "work-order-created"|
 "in-production"|
 "qc-passed"|
 "shipped"|
 "delivered";

export interface PipelineEvent{stage:OrderPipelineStage;at:string;detail?:string}
export interface OperationalPlan{
 order:CustomerOrder;
 manifest:ProductionDesignManifest;
 inventory:InventoryPosition[];
 purchaseOrders:PurchaseOrder[];
 manufacturerId:string;
 workOrder:WorkOrder;
 events:PipelineEvent[];
}

function push(events:PipelineEvent[],stage:OrderPipelineStage,at:string,detail?:string){events.push({stage,at,detail});}

export function createOperationalPlan(input:{
 order:CustomerOrder;
 manifest:ProductionDesignManifest;
 bom:BillOfMaterials;
 materials:MaterialSku[];
 suppliers:Supplier[];
 manufacturers:ManufacturerCapabilityProfile[];
 requirements:ProductionRequirements;
 now?:string;
}):OperationalPlan{
 const now=input.now??new Date().toISOString();
 const events:PipelineEvent[]=[];
 push(events,"storefront-configured",now,input.order.designId);

 if(!input.order.id||input.order.qty<1)throw new Error("valid customer order required");
 if(!input.order.paid)throw new Error("order must be paid before production planning");
 push(events,"order-created",now,input.order.id);

 assertLockedManifest(input.manifest);
 if(input.manifest.designId!==input.order.designId)throw new Error("order/design manifest mismatch");
 push(events,"production-manifest-locked",now,`${input.manifest.designId}:v${input.manifest.designVersion}`);

 const inventory=planInventory({order:input.order,bom:input.bom,materials:input.materials,suppliers:input.suppliers,now});
 push(events,"inventory-checked",now,`${inventory.positions.length} material positions`);

 const eligible=input.manufacturers.find(m=>manufacturerEligibility(m,input.requirements).eligible);
 if(!eligible)throw new Error("no eligible manufacturer");
 push(events,"manufacturer-eligible",now,eligible.manufacturerId);

 for(const po of inventory.purchaseOrders)push(events,"purchase-order-created",now,po.id);

 const workOrder=createWorkOrder({order:input.order,bom:input.bom,manufacturerId:eligible.manufacturerId,positions:inventory.positions});
 push(events,"work-order-created",now,workOrder.id);

 return{order:input.order,manifest:input.manifest,inventory:inventory.positions,purchaseOrders:inventory.purchaseOrders,manufacturerId:eligible.manufacturerId,workOrder,events};
}

const NEXT:Record<OrderPipelineStage,OrderPipelineStage[]>={
 "storefront-configured":["order-created"],
 "order-created":["production-manifest-locked"],
 "production-manifest-locked":["inventory-checked"],
 "inventory-checked":["manufacturer-eligible"],
 "manufacturer-eligible":["purchase-order-created","work-order-created"],
 "purchase-order-created":["purchase-order-created","work-order-created"],
 "work-order-created":["in-production"],
 "in-production":["qc-passed"],
 "qc-passed":["shipped"],
 "shipped":["delivered"],
 "delivered":[]
};

export function advanceOperationalStage(events:PipelineEvent[],to:OrderPipelineStage,at:string,detail?:string){
 const from=events.at(-1)?.stage;
 if(!from)throw new Error("pipeline has no current stage");
 if(!NEXT[from].includes(to))throw new Error(`illegal operational transition: ${from} -> ${to}`);
 return[...events,{stage:to,at,detail}];
}
