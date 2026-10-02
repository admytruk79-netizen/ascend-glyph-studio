export type Relation="anchor"|"nest"|"orbit"|"intersect"|"bridge"|"oppose"|"mirror"|"radiate"|"flow"|"enclose"|"repeat";
export type Family="earth"|"water"|"fire"|"air"|"spirit";
export type ProductionStatus="digitally-valid"|"manufacturable-estimate"|"sewout-validated"|"production-approved";
export type Node={id:string;glyphId:string;family:Family;role:"primary"|"secondary"|"connector"|"accent";};
export type Edge={from:string;to:string;relation:Relation;weight:number;};
export type TesseractState={version:1;seed:string;nodes:Node[];edges:Edge[];zoneId:string;materialId:string;manufacturerId?:string;parameters:{groundedExpansive:number;orderedOrganic:number;minimalComplex:number;quietCeremonial:number};productionStatus:ProductionStatus;};
