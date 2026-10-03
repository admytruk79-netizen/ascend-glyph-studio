export interface ManufacturerCapabilityProfile {
 manufacturerId:string; version:string; status:"candidate"|"approved"|"suspended";
 supportedGarmentStyleIds:readonly string[]; supportedMaterialIds:readonly string[];
 supportedRecipeIds:readonly string[]; supportedSizes:readonly string[];
 maxThreadColors:number; maxEmbroideryWidthMm:number; maxEmbroideryHeightMm:number;
 sampleApproved:boolean; productionApproved:boolean;
}
export interface ProductionRequirements {
 garmentStyleId:string; materialId:string; recipeIds:readonly string[]; size:string;
 threadColors:number; embroideryWidthMm:number; embroideryHeightMm:number;
}
export type Eligibility={eligible:true}|{eligible:false;reasons:readonly string[]};
export function manufacturerEligibility(p:ManufacturerCapabilityProfile,r:ProductionRequirements):Eligibility{
 const reasons:string[]=[];
 if(p.status!=="approved")reasons.push("manufacturer-not-approved");
 if(!p.sampleApproved)reasons.push("sample-not-approved");
 if(!p.productionApproved)reasons.push("production-not-approved");
 if(!p.supportedGarmentStyleIds.includes(r.garmentStyleId))reasons.push("garment-style-unsupported");
 if(!p.supportedMaterialIds.includes(r.materialId))reasons.push("material-unsupported");
 if(!p.supportedSizes.includes(r.size))reasons.push("size-unsupported");
 for(const id of r.recipeIds)if(!p.supportedRecipeIds.includes(id))reasons.push(`recipe-unsupported:${id}`);
 if(r.threadColors>p.maxThreadColors)reasons.push("thread-color-limit");
 if(r.embroideryWidthMm>p.maxEmbroideryWidthMm||r.embroideryHeightMm>p.maxEmbroideryHeightMm)reasons.push("embroidery-envelope-exceeded");
 return reasons.length?{eligible:false,reasons}:{eligible:true};
}