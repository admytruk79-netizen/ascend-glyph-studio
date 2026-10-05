import type{WorkStatus,SupplyStatus}from"./model";
const WORK_NEXT:Record<WorkStatus,WorkStatus[]>={
 planned:["released","blocked"],released:["cutting","blocked"],cutting:["embroidery","sewing","blocked"],embroidery:["sewing","blocked"],sewing:["finishing","blocked"],finishing:["qc","blocked"],qc:["complete","blocked"],complete:[],blocked:["planned","released"]
};
const PO_NEXT:Record<SupplyStatus,SupplyStatus[]>={
 draft:["approved","cancelled"],approved:["ordered","cancelled"],ordered:["partially-received","received","cancelled"],"partially-received":["received","cancelled"],received:[],cancelled:[]
};
export function advanceWork(from:WorkStatus,to:WorkStatus){if(!WORK_NEXT[from].includes(to))throw new Error(`illegal work transition: ${from} -> ${to}`);return to}
export function advancePurchase(from:SupplyStatus,to:SupplyStatus){if(!PO_NEXT[from].includes(to))throw new Error(`illegal purchase transition: ${from} -> ${to}`);return to}
