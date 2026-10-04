export type GarmentKind="traditional-shirt"|"buttoned-shirt"|"overshirt"|"tunic"|"jacket";
export type FitKind="fitted"|"regular"|"relaxed";
export type GarmentZoneKind="collar"|"placket"|"chest"|"shoulder"|"sleeve"|"cuff"|"yoke"|"hem"|"back";
export type SurfaceKind="flat"|"cylinder"|"tapered-cylinder"|"compound";

export type BodyMeasurements={
 chestMm?:number;waistMm?:number;neckMm?:number;shoulderMm?:number;
 sleeveMm?:number;wristMm?:number;bodyLengthMm?:number;
};

export type SizeProfile={
 id:string;label:string;standardSize?:string;body:BodyMeasurements;
 easeMm?:Partial<Record<"chest"|"waist"|"neck",number>>;
};

export type GarmentZone={
 id:string;kind:GarmentZoneKind;surface:SurfaceKind;
 widthMm?:number;heightMm?:number;circumferenceMm?:number;
 circumferenceEndMm?:number;seamPositions?:number[];
 editable:boolean;wrapAllowed:boolean;
};

export type ComponentChoice={
 collarId:string;sleeveId:string;cuffId:string;placketId:string;
 hemId?:string;yokeId?:string;closureId?:string;
};

export type MaterialChoice={
 substrateId:string;weightGsm?:number;colorId:string;shrinkagePct?:number;
};

export type GarmentConfiguration={
 id:string;garment:GarmentKind;fit:FitKind;size:SizeProfile;
 lengthId:string;components:ComponentChoice;material:MaterialChoice;
 zones:GarmentZone[];
};

export type CompatibilityRule={
 id:string;when:Partial<{garment:GarmentKind;fit:FitKind;collarId:string;sleeveId:string;cuffId:string;materialId:string}>;
 require?:string[];exclude?:string[];reason:string;
};

export type ConfigurationIssue={ruleId:string;reason:string;severity:"error"|"warning"};

export function validateGarmentConfiguration(c:GarmentConfiguration,rules:CompatibilityRule[]):ConfigurationIssue[]{
 const state={garment:c.garment,fit:c.fit,collarId:c.components.collarId,sleeveId:c.components.sleeveId,cuffId:c.components.cuffId,materialId:c.material.substrateId};
 return rules.flatMap(r=>{
  const matches=Object.entries(r.when).every(([k,v])=>state[k as keyof typeof state]===v);
  if(!matches)return [];
  const selected=new Set([c.components.collarId,c.components.sleeveId,c.components.cuffId,c.components.placketId,c.material.substrateId]);
  if(r.require?.some(x=>!selected.has(x)))return [{ruleId:r.id,reason:r.reason,severity:"error" as const}];
  if(r.exclude?.some(x=>selected.has(x)))return [{ruleId:r.id,reason:r.reason,severity:"error" as const}];
  return [];
 });
}

export function designableZones(c:GarmentConfiguration){return c.zones.filter(z=>z.editable);}
