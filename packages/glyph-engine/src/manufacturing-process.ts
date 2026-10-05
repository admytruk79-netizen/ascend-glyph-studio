import {ProductionProcess,ProductionSpecification} from "./production-contract";
import {ProductGeometry} from "./product-geometry";

export interface ProcessConstraintSet{
 minLineMm?:number;minGapMm?:number;registrationToleranceMm?:number;maxAreaMm2?:number;
}
export interface ManufacturingProcessProfile{
 id:string;revision:string;process:ProductionProcess;manufacturerId?:string;sourceId?:string;
 constraints:ProcessConstraintSet;
}
export interface ManufacturingProcessAdapter<TOutput>{
 process:ProductionProcess;
 preflight(geometry:ProductGeometry,profile:ManufacturingProcessProfile):{valid:boolean;errors:string[]};
 export(geometry:ProductGeometry,profile:ManufacturingProcessProfile):TOutput;
 specification(geometry:ProductGeometry,profile:ManufacturingProcessProfile):ProductionSpecification;
}
export function validateProcessProfile(p:ManufacturingProcessProfile):string[]{
 const errors:string[]=[];
 if(!p.id.trim()||!p.revision.trim())errors.push("missing-process-profile-identity");
 if(!p.manufacturerId&&!p.sourceId)errors.push("missing-process-profile-provenance");
 for(const [k,v] of Object.entries(p.constraints))if(v!==undefined&&(!Number.isFinite(v)||v<0))errors.push(`invalid-constraint:${k}`);
 return errors;
}
