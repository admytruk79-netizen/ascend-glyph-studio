import type {ProductionGate} from "./production-manifest";
const NEXT:Record<ProductionGate,readonly ProductionGate[]>={
 "design-locked":["production-validated"],
 "production-validated":["manufacturer-eligible"],
 "manufacturer-eligible":["payment-captured"],
 "payment-captured":["package-generated"],
 "package-generated":["manufacturer-accepted"],
 "manufacturer-accepted":["in-production"],
 "in-production":["qc-passed"],
 "qc-passed":["shipped"],
 "shipped":["delivered"],
 "delivered":[]
};
export function canAdvance(from:ProductionGate,to:ProductionGate){return NEXT[from].includes(to);}
export function advance(from:ProductionGate,to:ProductionGate):ProductionGate{
 if(!canAdvance(from,to))throw new Error(`illegal production transition: ${from} -> ${to}`);
 return to;
}
