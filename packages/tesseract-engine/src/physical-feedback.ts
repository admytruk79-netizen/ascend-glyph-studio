export type DefectType="thread-crowding"|"gap-loss"|"curve-distortion"|"registration-drift"|"seam-mismatch"|"fill-collapse"|"edge-fray"|"tooling-bridge"|"emboss-fill-in"|"other";
export type PhysicalMeasurement={featureMm?:number;gapMm?:number;density?:number;registrationErrorMm?:number;curveErrorMm?:number;notes?:string[]};
export type PhysicalValidation={
 id:string;candidateId:string;medium:string;substrateId?:string;machineProfileId?:string;
 predicted:PhysicalMeasurement;actual:PhysicalMeasurement;
 defects:{type:DefectType;severity:number;zoneId?:string;note?:string}[];
 status:"sampled"|"measured"|"reviewed"|"production-validated";
 createdAt:string;
};
export type CorrectionSignal={metric:string;delta:number;confidence:number;sourceValidationId:string};
const num=(n?:number)=>typeof n==="number"&&Number.isFinite(n);
export function deriveCorrectionSignals(v:PhysicalValidation):CorrectionSignal[]{
 const out:CorrectionSignal[]=[];const pairs:[keyof PhysicalMeasurement,string][]=[
  ["featureMm","minFeatureMm"],["gapMm","minGapMm"],["density","maxDensity"],["registrationErrorMm","registrationToleranceMm"],["curveErrorMm","curveToleranceMm"]];
 for(const [k,metric] of pairs){const p=v.predicted[k],a=v.actual[k];if(num(p as number)&&num(a as number))out.push({metric,delta:(a as number)-(p as number),confidence:v.status==="production-validated"?1:v.status==="reviewed"?.85:v.status==="measured"?.7:.45,sourceValidationId:v.id});}
 return out;
}
export function validationPenalty(v:PhysicalValidation){
 const defect=v.defects.reduce((s,d)=>s+Math.max(0,Math.min(1,d.severity)),0);
 const reg=v.actual.registrationErrorMm??0,curve=v.actual.curveErrorMm??0;
 return Math.min(1,defect*.12+reg*.03+curve*.02);
}
