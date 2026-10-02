export const families=["earth","water","fire","air","spirit"] as const;
export type Family=typeof families[number];
export type CompositionMode="emblem"|"border"|"path"|"field"|"composition";
export type StudioState={
 family:Family; selectedGlyphIds:string[]; garmentId:string; zoneId:string; mode:CompositionMode;
 seed:string; variation:number; groundedExpansive:number; orderedOrganic:number; minimalComplex:number; quietCeremonial:number;
};
export const initialStudioState:StudioState={
 family:"earth",selectedGlyphIds:[],garmentId:"ascend-linen-shirt-01",zoneId:"chest",mode:"emblem",
 seed:"ascend-001",variation:0,groundedExpansive:.5,orderedOrganic:.35,minimalComplex:.45,quietCeremonial:.55
};
