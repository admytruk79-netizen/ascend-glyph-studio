export const families=["earth","water","fire","air","spirit"] as const;
export type Family=typeof families[number];
export type StudioState={
 family:Family; selectedGlyphIds:string[]; garmentId:string; zoneId:string;
 mode:"emblem"|"border"|"path"|"field"|"composition";
};
export const initialStudioState:StudioState={
 family:"earth",selectedGlyphIds:[],garmentId:"ascend-linen-shirt-01",zoneId:"chest",mode:"emblem"
};
