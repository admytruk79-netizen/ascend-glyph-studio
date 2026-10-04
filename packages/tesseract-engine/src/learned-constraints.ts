import type {PhysicalValidation} from "./physical-feedback";
import type {MediumId,ProductionLimits} from "./medium-compiler";
import {DEFAULT_LIMITS} from "./medium-compiler";
import {learnProductionLimits,type LearnedLimits} from "./production-learning";

export type ConstraintProvider=()=>Promise<PhysicalValidation[]>;
export type LearnedConstraintSnapshot={medium:MediumId;limits:LearnedLimits;loadedAt:string};

export async function loadLearnedConstraints(medium:MediumId,provider:ConstraintProvider,base:ProductionLimits=DEFAULT_LIMITS[medium]):Promise<LearnedConstraintSnapshot>{
 const validations=await provider();
 const limits=learnProductionLimits(medium,validations,base);
 return {medium,limits,loadedAt:new Date().toISOString()};
}

export function chooseProductionLimits(medium:MediumId,snapshot?:LearnedConstraintSnapshot):ProductionLimits{
 if(!snapshot||snapshot.medium!==medium||snapshot.limits.sampleCount===0)return DEFAULT_LIMITS[medium];
 return snapshot.limits;
}
