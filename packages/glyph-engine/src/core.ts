export interface ProductGeometry{id:string;widthMm:number;heightMm:number;safeInsetMm:number;role:string}
export interface ProductContext{kind:string;material?:string;process?:string;zones:ProductGeometry[];constraints?:Record<string,number|string|boolean>}
export type Density="restrained"|"balanced"|"complex";
export type Symmetry="bilateral"|"radial"|"translational"|"asymmetric-balanced";
export interface SynthesisIntent{seed:string;meanings:string[];principleIds:string[];density:Density;symmetry:Symmetry}
export interface EngineIntent extends SynthesisIntent{product:ProductContext}
export function validateSynthesisIntent(x:SynthesisIntent):string[]{const e:string[]=[];if(!x.seed.trim())e.push("seed required");if(!x.meanings.length)e.push("semantic intent required");if(!x.principleIds.length)e.push("evidence-backed principles required");return e}
export function validateProductContext(x:ProductContext):string[]{const e:string[]=[];if(!x.kind.trim())e.push("product kind required");if(!x.zones.length)e.push("at least one product zone required");for(const z of x.zones){if(z.widthMm<=0||z.heightMm<=0)e.push(`invalid geometry: ${z.id}`);if(z.safeInsetMm<0)e.push(`invalid safe inset: ${z.id}`)}return e}
export function validateEngineIntent(x:EngineIntent):string[]{return[...validateSynthesisIntent(x),...validateProductContext(x.product)]}
export function attachProduct(intent:SynthesisIntent,product:ProductContext):EngineIntent{return{...intent,product}}
