export type ProductionValidationState="reference"|"pattern-specified"|"sample-measured"|"manufacturer-validated"|"production-validated";
export type ProductionProcess="print"|"embroidery"|"engraving"|"laser"|"weaving"|"cut-sew"|"other";

export interface ProductionSpecification{
 id:string;
 revision:string;
 productKind:string;
 process:ProductionProcess;
 substrate?:string;
 manufacturerId?:string;
 sourceId?:string;
 state:ProductionValidationState;
}

export interface ProductionGate{
 state:ProductionValidationState;
 productionApproved:boolean;
 blockers:string[];
 specification?:ProductionSpecification;
}

export function evaluateProductionGate(specification?:ProductionSpecification,physicalSampleValidated=false):ProductionGate{
 const blockers:string[]=[];
 if(!specification)blockers.push("manufacturer-production-specification-required");
 else{
  if(!specification.id.trim()||!specification.revision.trim())blockers.push("production-specification-identity-required");
  if(!specification.manufacturerId&&!specification.sourceId)blockers.push("production-specification-provenance-required");
  if(specification.state!=="manufacturer-validated"&&specification.state!=="production-validated")blockers.push("manufacturer-validation-required");
 }
 if(!physicalSampleValidated)blockers.push("physical-sample-validation-required");
 const productionApproved=!!specification&&specification.state==="production-validated"&&physicalSampleValidated&&!blockers.length;
 return{state:productionApproved?"production-validated":specification?.state??"reference",productionApproved,blockers,specification};
}
